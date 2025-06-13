import { GoogleGenerativeAI } from '@google/generative-ai';
import db, { Sequelize } from '../models';
import { Op, where } from 'sequelize';
import { sequelize } from '../models';
import { TRAINING_DATA, VIETNAMESE_STOPWORDS } from './training.data';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_MODEL = "gemini-1.5-flash";
const FALLBACK_MODELS = ["gemini-1.5-flash"];

const BASE_SYSTEM_PROMPT = `
    You are a helpful shopping assistant for an online clothing store. Your name is ClothesShop Assistant.

    Follow these rules:
    1. Start every conversation with a friendly greeting.
    2. Only answer questions related to shopping and the products in our database.
    3. If you don't have information about something, say you don't know.
    4. Do not search for or mention external products or websites.
    5. Keep responses concise and helpful.
    6. Respond naturally to social phrases (like "thank you", "ok", etc.) with friendly Vietnamese responses.
    7. Use conversational Vietnamese that matches how young people speak today, friendly but professional.
    8. Never output debug information or notes to self in your responses.
    9. Never output text in English or explain your limitations in responses.
    10. Never add comments like "At this point...", "I would need..." - just provide the information directly.
    11. If you don't have specific data about something, provide a general response without mentioning that you don't have access to a database.
`;

const PRODUCT_SEARCH_PROMPT = `
    ${BASE_SYSTEM_PROMPT}

    Khi trả lời về sản phẩm:

    1. Xác nhận ý định tìm kiếm:
    - "Dạ, để em tìm [mô tả sản phẩm] cho anh/chị nhé."
    - "Dạ, em hiểu anh/chị đang tìm [mô tả sản phẩm] đúng không ạ?"

    2. Trả lời kết quả:
    - Nếu tìm thấy: "Em tìm được [số lượng] sản phẩm phù hợp:"
    - Nếu không tìm thấy: "Em xin lỗi, em không tìm thấy [mô tả]. Anh/chị có thể thử tìm với tiêu chí khác ạ."
    - Nếu có category: "Các sản phẩm thuộc [tên category]:"

    3. Format sản phẩm:
    - [Tên sản phẩm]
    - Giá: [giá] VNĐ
    - Rating: [X/5 sao] ([số lượng] đánh giá) (nếu có thì mới hiển thị)
    - Size: [danh sách size]
    - Màu: [danh sách màu]
    - Shop: [tên shop]

    4. Quy tắc:
    - KHÔNG hỏi thêm thông tin
    - KHÔNG giải thích kết quả
    - KHÔNG gợi ý tìm kiếm khác
    - KHÔNG dùng từ "sản phẩm số X"
`;

const SHOP_SEARCH_PROMPT = `
    ${BASE_SYSTEM_PROMPT}

    Khi trả lời về shop:

    1. Xác nhận ý định tìm kiếm:
    - "Dạ, để em tìm cửa hàng [mô tả] cho anh/chị nhé."
    - "Dạ, em hiểu anh/chị đang muốn tìm shop [mô tả] đúng không ạ?"

    2. Trả lời kết quả:
    - Nếu tìm thấy: "Em tìm được [số lượng] cửa hàng phù hợp:"
    - Nếu không tìm thấy: "Em xin lỗi, em không tìm thấy cửa hàng [mô tả]. Anh/chị có thể thử tìm với tiêu chí khác ạ."

    3. Format thông tin shop:
    - Tên shop: [tên]
    - Địa chỉ: [địa chỉ] (nếu có)
    - Email: [email] (nếu có)
    - Một số sản phẩm tiêu biểu: (nếu có)

    4. Quy tắc:
    - KHÔNG hỏi thêm thông tin
    - KHÔNG giải thích kết quả
    - KHÔNG gợi ý tìm kiếm khác
    - KHÔNG dùng từ "cửa hàng số X"
`;

const SOCIAL_PROMPT = `
    ${BASE_SYSTEM_PROMPT}

    For social interactions:
    1. Keep responses short and natural
    2. Match the user's tone and energy
    3. Use casual but polite Vietnamese
    4. Don't force the conversation back to shopping
    5. Respond to gratitude with warmth
    6. Use appropriate Vietnamese social phrases
`;

export const initChat = async (userId) => {
    try {
        // Check if user exists
        const user = await db.User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Find existing chat history or create new one
        let [chatHistory, created] = await db.ChatHistory.findOrCreate({
            where: { user_id: userId },
            defaults: {
                user_id: userId,
                messages: []
            }
        });

        // If we're starting a new chat (either new record or empty messages)
        if (created || chatHistory.messages.length === 0) {
            // Add initial greeting message from bot
            const initialMessage = {
                role: 'assistant',
                content: 'Xin chào! Tôi là ClothesShop Assistant. Tôi có thể giúp bạn tìm kiếm quần áo, phụ kiện và trả lời các câu hỏi về sản phẩm của chúng tôi. Bạn muốn tìm kiếm sản phẩm gì hôm nay?'
            };

            // Update chat history with greeting message
            chatHistory.messages = [initialMessage];
            await chatHistory.save();
        }

        return {
            chatId: chatHistory.id,
            messages: chatHistory.messages
        };
    } catch (error) {
        throw error;
    }
};

/** Xử lý message từ người dùng đã đăng nhập **/
export const processMessage = async (userId, userMessage) => {
    try {
        /** Tìm kiếm sản phẩm dựa trên message của người dùng **/
        const searchTerms = await extractSearchTerms(userMessage);
        const searchResults = await searchProductOrShop(searchTerms);

        /** Tạo response từ bot dựa trên message và kết quả tìm kiếm **/
        const botResponse = await generateBotResponse([{ role: 'user', content: userMessage }], searchResults);

        return {
            message: botResponse,
            searchResults: searchResults
        };
    } catch (error) {
        throw error;
    }
};

/** Lấy lịch sử chat cho một người dùng **/
export const getChatHistory = async (userId) => {
    try {
        const chatHistory = await db.ChatHistory.findOne({
            where: { user_id: userId }
        });

        if (!chatHistory) {
            return { messages: [] };
        }

        return {
            chatId: chatHistory.id,
            messages: chatHistory.messages || []
        };
    } catch (error) {
        throw error;
    }
};

const cleanVietnameseText = (text) => {
    // Tách câu thành các từ
    let words = text.toLowerCase().split(/\s+/);
    // Loại bỏ stopwords
    words = words.filter(word => !VIETNAMESE_STOPWORDS.includes(word));
    // Nối lại thành câu
    return words.join(' ').trim();
};

/** Tách từ khóa tìm kiếm từ message **/
const extractSearchTermsWithGemini = async (message) => {
    try {
        const cleanedMessage = cleanVietnameseText(message);
        // 1. Tạo examples string từ TRAINING_DATA
        const examplesString = TRAINING_DATA.map(example => (`
            Input: "${example.query}"
            Output: ${JSON.stringify(example.extraction, null, 2)}
        `)).join('\n\n');

        // 2. Tạo prompt với examples và context
        const prompt = `
            Phân tích yêu cầu tìm kiếm sản phẩm hoặc cửa hàng thời trang và trích xuất các thông tin quan trọng.

            Dưới đây là một số ví dụ về cách phân tích:

            ${examplesString}

            Bây giờ, hãy phân tích yêu cầu sau:
            Input: "${cleanedMessage}"

            Trả về kết quả dưới dạng JSON với các trường:
            {
                "category_name": "", // Danh mục chính của sản phẩm (ví dụ: áo, quần, váy/đầm...)
                "name": "", // Tên đầy đủ/cụ thể của sản phẩm
                "keywords": "", // Từ khóa tìm kiếm chung
                "color": "", // Tên màu sắc
                "size": "", // Size (S/M/L/XL/XXL)
                "gender": "", // Giới tính (Male/Female/Unisex/Kids)
                "minPrice": null, // Giá tối thiểu (VND)
                "maxPrice": null, // Giá tối đa (VND)
                "requiresGoodRating": false // true nếu yêu cầu đẹp/tốt/đánh giá tốt/chất lượng cao,
                "isShopSearch": false, // true nếu đang tìm kiếm cửa hàng
                "shopKeywords": "" // Từ khóa tìm kiếm cửa hàng
            }

            Quy tắc:
            1. Sử dụng cleaned input để xác định category và name chính xác
            2. Chuyển đổi tất cả giá tiền (ví dụ "500k", "1 triệu", "1000000", "100tr") sang VNĐ
            3. Chuẩn hóa giới tính ("nam" -> Male, "nữ" -> Female, "unisex" -> Unisex, "kids" -> Kids)
            4. Chỉ trích xuất màu sắc cụ thể
            5. Chỉ bao gồm các trường được đề cập rõ ràng
            6. Làm sạch các giá trị khỏi stopwords
            7. Để minPrice/maxPrice là null khi không có giới hạn giá tương ứng
            8. Với "dưới X", maxPrice = X và minPrice = null
            9. Với "từ X", minPrice = X và maxPrice = null
            10. Với "từ X đến Y", minPrice = X và maxPrice = Y
            11. Đặt requiresGoodRating = true khi có các từ khóa: "đẹp", "tốt", "chất lượng cao", "đánh giá cao", "uy tín", "nổi tiếng"
            12. Luôn cố gắng trích xuất category_name là danh mục chính (áo, quần, váy...) từ câu hỏi đã được làm sạch
            13. Nếu có tên sản phẩm cụ thể, điền vào trường name từ câu hỏi đã được làm sạch
            14. Set isShopSearch = true khi có các từ khóa: "shop", "cửa hàng", "tiệm", "nơi bán"
            15. Nếu isShopSearch = true, trích xuất shopKeywords từ nội dung tìm kiếm
            16. Xử lý các cách diễn đạt tự nhiên trong tiếng Việt, như tiếng lóng ("xịn", "chất", "cool") hoặc cách viết tắt ("500k", "1m", "100tr").
            17. Nếu input không rõ ràng, ưu tiên suy luận dựa trên ngữ cảnh phổ biến trong lĩnh vực thời trang tiếng Việt.
            18. Nếu có nhiều màu sắc hoặc kích cỡ được đề cập, chọn màu sắc/kích cỡ được nhấn mạnh nhất (thường là cái đầu tiên).

            Ví dụ:
            - "Cho tôi tất cả áo" -> category_name: "áo", name: ""
            - "Tìm áo da mùa đông" -> category_name: "áo da", name: "áo da mùa đông"
            - "Tìm áo khoác da màu đen" -> category_name: "áo khoác", name: "áo khoác da", color: "đen"
            - "Shop bán váy vintage ở Hà Nội" -> isShopSearch: true, category_name: "váy", style: "vintage", location: "Hà Nội", shopKeywords: "shop váy vintage"
            - "Áo thun Zara giá dưới 500k" -> category_name: "áo thun", name: "áo thun", brand: "Zara", maxPrice: 500000
            - "Quần jeans xịn cho nữ" -> category_name: "quần jeans", name: "quần jeans", gender: "Female", requiresGoodRating: true, material: "jeans"

            Trả về JSON theo format sau (chỉ điền các trường được đề cập trong input):
        `;

        // 3. Gọi Gemini API
        const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // 4. Parse kết quả JSON
        let geminiResults = {};
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                geminiResults = JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            return null;
        }
        console.log(geminiResults);
        // 5. Validate và clean kết quả
        const cleanedResults = {
            categoryIds: [], // Sẽ được điền sau
            name: geminiResults.name || '',
            keywords: geminiResults.keywords || '',
            color: geminiResults.color || '',
            size: geminiResults.size || '',
            gender: geminiResults.gender || '',
            minPrice: geminiResults.minPrice,
            maxPrice: geminiResults.maxPrice,
            requiresGoodRating: geminiResults.requiresGoodRating || false,
            isShopSearch: geminiResults.isShopSearch || false,
            shopKeywords: geminiResults.shopKeywords || '',
            isSocialOnly: false
        };

        // 6. Tìm categoryIds dựa trên category_name hoặc name
        if (geminiResults.category_name) {
            // Tìm kiếm theo category (toàn bộ sản phẩm của danh mục)
            const categories = await db.Category.findAll({
                attributes: ['id', 'category_name', 'parentId']
            });

            const searchTerm = geminiResults.category_name.toLowerCase();

            // Tìm match chính xác trước
            const exactMatch = categories.find(
                cat => cat.category_name.toLowerCase() === searchTerm
            );

            if (exactMatch) {
                cleanedResults.categoryIds = [exactMatch.id];
                // Nếu là category cha, thêm tất cả category con
                if (!exactMatch.parentId) {
                    categories.forEach(cat => {
                        if (cat.parentId === exactMatch.id) {
                            cleanedResults.categoryIds.push(cat.id);
                        }
                    });
                } else {
                    cleanedResults.categoryIds.push(exactMatch.parentId);
                }
            } else {
                // Nếu không có match chính xác, tìm partial matches
                // 1. Tìm các category có tên chứa searchTerm
                const directMatches = categories.filter(
                    cat => cat.category_name.toLowerCase().includes(searchTerm)
                );

                // 2. Tìm parent categories của các matches
                const parentIds = new Set(
                    directMatches
                        .map(cat => cat.parentId)
                        .filter(id => id !== null)
                );

                // 3. Tìm các category con khác của cùng parent (siblings)
                const siblingIds = new Set();
                parentIds.forEach(parentId => {
                    categories
                        .filter(cat => cat.parentId === parentId)
                        .forEach(sibling => siblingIds.add(sibling.id));
                });

                // 4. Kết hợp tất cả matches
                const allMatches = new Set([
                    ...directMatches.map(cat => cat.id),
                    ...parentIds,
                    ...siblingIds
                ]);

                cleanedResults.categoryIds = Array.from(allMatches);
            }

            cleanedResults.name = geminiResults.name;
        }

        return cleanedResults;
    } catch (error) {
        console.error('Error in Gemini extraction:', error);
        return null;
    }
};

const extractSearchTerms = async (message) => {
    if (!message || typeof message !== 'string') {
        return {
            categoryIds: [],
            name: '',
            isSocialOnly: false
        };
    }

    let lowerMessage = message.toLowerCase();

    // Kiểm tra từ khóa xã giao
    const socialPhrases = [
        'cảm ơn', 'thanks', 'thank', 'cám ơn', 'ok', 'oke', 'được', 'hay', 'tốt', 'good', 'nice',
        'tuyệt vời', 'great', 'hello', 'hi', 'xin chào', 'chào', 'bye', 'tạm biệt',
        'vâng', 'ừ', 'đúng', 'sai', 'không', 'yes', 'no', 'cool', 'wow', 'amazing',
        'chuẩn', 'đỉnh', 'quá xịn', 'xuất sắc', 'quá đã', 'quá tốt', 'hiểu rồi'
    ];

    const isSocialPhrase = socialPhrases.some(phrase => {
        const regex = new RegExp(`(^|\\s)${phrase}(\\s|$|[,.!?;:])`, 'i');
        return regex.test(lowerMessage);
    });

    if (isSocialPhrase && lowerMessage.length < 20) {
        return {
            categoryIds: [],
            name: '',
            isSocialOnly: true
        };
    }

    try {
        const searchTerms = await extractSearchTermsWithGemini(message);

        if (searchTerms) {
            return searchTerms;
        }

        return {
            categoryIds: [],
            name: message,
            isSocialOnly: false
        };
    } catch (error) {
        console.error('Error in extractSearchTerms:', error);
        return searchTerms;
    }
};

/** Tìm kiếm sản phẩm hoặc shop **/
const searchProductOrShop = async (searchTerms) => {
    try {
        // Log để debug
        console.log('Search terms:', searchTerms);
        if (!searchTerms || typeof searchTerms !== 'object') {
            console.error('Invalid searchTerms:', searchTerms);
            return { type: 'error', message: 'Invalid search terms' };
        }

        // Nếu là tìm kiếm shop, chuyển sang searchShops
        if (searchTerms.isShopSearch) {
            return await searchShops(searchTerms);
        }

        // Kiểm tra xem có điều kiện tìm kiếm nào không
        const hasSearchConditions =
            (searchTerms.categoryIds && searchTerms.categoryIds.length > 0) ||
            searchTerms.name ||
            searchTerms.keywords ||
            searchTerms.color ||
            searchTerms.size ||
            searchTerms.gender ||
            searchTerms.minPrice ||
            searchTerms.maxPrice;

        // Nếu không có điều kiện tìm kiếm nào, trả về mảng rỗng
        if (!hasSearchConditions) {
            return {
                type: 'products',
                data: [],
                total: 0,
                message: 'Không tìm thấy sản phẩm phù hợp với yêu cầu của bạn'
            };
        }

        /** Subquery để tính rating trung bình **/
        const subQueryRating = sequelize.literal(`(
            SELECT AVG(rating)
            FROM Reviews
            WHERE Reviews.product_id = Product.id
        )`);

        const subQueryReviewCount = sequelize.literal(`(
            SELECT COUNT(*)
            FROM Reviews 
            WHERE Reviews.product_id = Product.id
        )`);

        const query = {
            attributes: {
                include: [
                    'id',
                    'product_name',
                    'origin',
                    'gender',
                    'description',
                    'sold_quantity',
                    'unit_price',
                    'createdAt',
                    [subQueryRating, 'rating'],
                    [subQueryReviewCount, 'review_count']
                ]
            },
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    required: false,
                    attributes: ['id', 'category_name', 'description', 'image_url'],
                    include: [
                        {
                            model: db.Category,
                            as: 'parent',
                            attributes: ['id', 'category_name', 'description', 'image_url']
                        }
                    ]
                },
                {
                    model: db.ProductVariant,
                    as: 'variants',
                    attributes: ['id', 'sku', 'stock_quantity', 'image_url'],
                    include: [
                        {
                            model: db.Size,
                            as: 'size',
                            attributes: ['id', 'size_code']
                        },
                        {
                            model: db.Color,
                            as: 'color',
                            attributes: ['id', 'color_name', 'color_code']
                        }
                    ]
                },
                {
                    model: db.ProductImages,
                    as: 'product_images',
                    attributes: ['id', 'image_url']
                },
                {
                    model: db.Shop,
                    as: 'shop',
                    attributes: ['id', 'shop_name', 'logo_url', 'contact_address', 'contact_email'],
                    required: false
                }
            ],
            where: {},
            group: [
                'Product.id',
                'category.id',
                'category->parent.id',
                'variants.id',
                'variants->size.id',
                'variants->color.id',
                'product_images.id',
                'shop.id'
            ],
            having: {}
        };

        // Xử lý tìm kiếm theo danh mục
        if (searchTerms.categoryIds && searchTerms.categoryIds.length > 0) {
            query.where.categoryId = {
                [Op.in]: searchTerms.categoryIds
            };
        }

        // Tìm theo tên sản phẩm hoặc từ khóa
        if (searchTerms.name || searchTerms.keywords) {
            const searchText = searchTerms.name || searchTerms.keywords;
            if (!query.where[Op.and]) {
                query.where[Op.and] = [];
            }
            query.where[Op.and].push({
                product_name: {
                    [Op.like]: `%${searchText}%`
                }
            });
        }

        // Tìm theo giới tính
        if (searchTerms.gender) {
            if (!query.where[Op.and]) {
                query.where[Op.and] = [];
            }
            query.where[Op.and].push({ gender: searchTerms.gender });
        }

        // Tìm theo khoảng giá
        if (searchTerms.minPrice || searchTerms.maxPrice) {
            const priceCondition = {};
            if (searchTerms.minPrice) {
                priceCondition[Op.gte] = searchTerms.minPrice;
            }
            if (searchTerms.maxPrice) {
                priceCondition[Op.lte] = searchTerms.maxPrice;
            }
            if (!query.where[Op.and]) {
                query.where[Op.and] = [];
            }
            query.where[Op.and].push({ unit_price: priceCondition });
        }

        // Tìm theo rating
        if (searchTerms.requiresGoodRating) {
            query.having = sequelize.literal('rating >= 4.0');
        }

        /** Thực hiện tìm kiếm **/
        let products = await db.Product.findAll(query);

        console.log('Found products before filtering:', products.length); // Debug log

        // Lọc theo size và color nếu có yêu cầu
        if (searchTerms.size || searchTerms.color) {
            products = products.filter(product => {
                const variants = product.variants || [];
                return variants.some(variant => {
                    const matchesSize = !searchTerms.size ||
                        (variant.size && variant.size.size_code.toLowerCase() === searchTerms.size.toLowerCase());
                    const matchesColor = !searchTerms.color ||
                        (variant.color && variant.color.color_name.toLowerCase() === searchTerms.color.toLowerCase());
                    return matchesSize && matchesColor;
                });
            });
        }

        console.log('Found products after filtering:', products.length); // Debug log

        // Sắp xếp kết quả theo rating và giá
        products.sort((a, b) => {
            const ratingA = a.getDataValue('rating') || 0;
            const ratingB = b.getDataValue('rating') || 0;
            if (ratingB !== ratingA) {
                return ratingB - ratingA;
            }
            return a.unit_price - b.unit_price;
        });

        // Giới hạn số lượng kết quả
        const limitedProducts = products.slice(0, 5);

        // Nếu không tìm thấy sản phẩm nào
        if (!products || products.length === 0) {
            return {
                type: 'products',
                data: [],
                total: 0,
                message: 'Không tìm thấy sản phẩm phù hợp với yêu cầu của bạn'
            };
        }

        return {
            type: 'products',
            data: formatProductsForResponse(limitedProducts),
            total: products.length
        };

    } catch (error) {
        console.error('Product search error:', error);
        return { type: 'error', message: error.message };
    }
};

/** Tìm kiếm shop **/
const searchShops = async (searchTerms) => {
    try {
        const query = {
            where: {},
            include: [
                {
                    model: db.Product,
                    as: 'products',
                    required: false,
                    attributes: [
                        'id',
                        'product_name',
                        'unit_price',
                        'gender',
                        'description',
                        [
                            sequelize.literal(`(
                                SELECT AVG(rating)
                                FROM Reviews
                                WHERE Reviews.product_id = products.id
                            )`),
                            'avg_rating'
                        ],
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*)
                                FROM Reviews
                                WHERE Reviews.product_id = products.id
                            )`),
                            'review_count'
                        ]
                    ],
                    include: [
                        {
                            model: db.ProductVariant,
                            as: 'variants',
                            attributes: ['id', 'sku', 'stock_quantity', 'image_url'],
                            include: [
                                {
                                    model: db.Size,
                                    as: 'size',
                                    attributes: ['id', 'size_code']
                                },
                                {
                                    model: db.Color,
                                    as: 'color',
                                    attributes: ['id', 'color_name', 'color_code']
                                }
                            ]
                        },
                        {
                            model: db.ProductImages,
                            as: 'product_images',
                            attributes: ['id', 'image_url']
                        }
                    ]
                }
            ],
            attributes: [
                'id',
                'shop_name',
                'contact_email',
                'contact_address',
                'logo_url',
                [
                    sequelize.literal(`(
                        SELECT AVG(r.rating)
                        FROM Reviews r
                        JOIN Products p ON r.product_id = p.id
                        WHERE p.shopId = Shop.id
                    )`),
                    'avg_rating'
                ],
                [
                    sequelize.literal(`(
                        SELECT COUNT(r.id)
                        FROM Reviews r
                        JOIN Products p ON r.product_id = p.id
                        WHERE p.shopId = Shop.id
                    )`),
                    'total_reviews'
                ]
            ]
        };

        // Tìm theo tên shop
        if (searchTerms.shopKeywords) {
            query.where[Op.or] = [
                { shop_name: { [Op.like]: `%${searchTerms.shopKeywords}%` } },
                { description: { [Op.like]: `%${searchTerms.shopKeywords}%` } }
            ];
        }

        // Nếu có yêu cầu về category hoặc gender, thêm điều kiện cho products
        if (searchTerms.categoryIds?.length > 0 || searchTerms.gender) {
            const productConditions = {};

            if (searchTerms.categoryIds?.length > 0) {
                productConditions.categoryId = { [Op.in]: searchTerms.categoryIds };
            }

            if (searchTerms.gender) {
                productConditions.gender = searchTerms.gender;
            }

            query.include[0].where = productConditions;
            query.include[0].required = true;
        }

        // Nếu yêu cầu đánh giá tốt
        if (searchTerms.requiresGoodRating) {
            query.having = sequelize.literal('avg_rating >= 4.0');
        }

        // Thực hiện tìm kiếm
        const shops = await db.Shop.findAll({
            ...query,
            group: ['Shop.id', 'products.id', 'products->variants.id', 'products->variants->size.id', 'products->variants->color.id', 'products->product_images.id'],
            having: query.having
        });

        // Nếu không tìm thấy shop nào
        if (!shops || shops.length === 0) {
            return {
                type: 'shops',
                data: [],
                total: 0,
                message: 'Không tìm thấy cửa hàng phù hợp với yêu cầu của bạn'
            };
        }

        // Format kết quả và lấy 5 shop đầu tiên
        const formattedShops = shops.slice(0, 5).map(shop => {
            // Format thông tin shop
            const shopData = {
                id: shop.id,
                name: shop.shop_name,
                email: shop.contact_email,
                address: shop.contact_address,
                logo_url: shop.logo_url,
                avg_rating: shop.getDataValue('avg_rating')
                    ? parseFloat(shop.getDataValue('avg_rating')).toFixed(1)
                    : "Chưa có đánh giá",
                total_reviews: parseInt(shop.getDataValue('total_reviews') || 0),
                total_products: shop.products ? shop.products.length : 0
            };

            // Format sản phẩm của shop
            if (shop.products && shop.products.length > 0) {
                shopData.products = shop.products.slice(0, 3).map(product => ({
                    id: product.id,
                    name: product.product_name,
                    price: product.unit_price,
                    gender: product.gender,
                    description: product.description,
                    image_url: product.product_images && product.product_images[0]
                        ? product.product_images[0].image_url
                        : null,
                    sizes: [...new Set(product.variants
                        .filter(v => v.size)
                        .map(v => v.size.size_code))],
                    colors: [...new Set(product.variants
                        .filter(v => v.color)
                        .map(v => v.color.color_name))],
                    rating: product.getDataValue('avg_rating')
                        ? parseFloat(product.getDataValue('avg_rating')).toFixed(1)
                        : "Chưa có đánh giá",
                    review_count: parseInt(product.getDataValue('review_count') || 0)
                }));
            }

            return shopData;
        });

        return {
            type: 'shops',
            data: formattedShops,
            total: shops.length
        };

    } catch (error) {
        console.error('Shop search error:', error);
        return { type: 'error', message: error.message };
    }
};

// Format products for chatbot response
const formatProductsForResponse = (products) => {
    if (!products || products.length === 0) {
        return [];
    }

    return products.map(product => {
        // Tách và sắp xếp variants theo size và color
        const variants = new Map(); // Map để nhóm variants theo color
        const sizes = new Set();
        const colors = new Set();

        if (product.variants) {
            product.variants.forEach(variant => {
                if (variant.size) sizes.add(variant.size.size_code);
                if (variant.color) colors.add(variant.color.color_name);

                // Nhóm variants theo color
                if (variant.color) {
                    if (!variants.has(variant.color.color_name)) {
                        variants.set(variant.color.color_name, {
                            color: {
                                name: variant.color.color_name,
                                code: variant.color.color_code
                            },
                            sizes: new Set(),
                            image: variant.image_url,
                            stock: 0
                        });
                    }
                    const colorVariant = variants.get(variant.color.color_name);
                    if (variant.size) colorVariant.sizes.add(variant.size.size_code);
                    colorVariant.stock += variant.stock_quantity || 0;
                }
            });
        }

        // Convert variants Map to array and sort sizes
        const formattedVariants = Array.from(variants.values()).map(v => ({
            ...v,
            sizes: Array.from(v.sizes).sort()
        }));

        // Format product data
        return {
            id: product.id,
            name: product.product_name,
            price: product.unit_price,
            origin: product.origin,
            gender: product.gender,
            description: product.description,
            sold_quantity: product.sold_quantity,
            rating: product.getDataValue('rating') ?
                parseFloat(product.getDataValue('rating')).toFixed(1) : null,
            review_count: product.getDataValue('review_count') || 0,
            category: product.category ? {
                id: product.category.id,
                name: product.category.category_name,
                description: product.category.description,
                image_url: product.category.image_url,
                parent: product.category.parent ? {
                    id: product.category.parent.id,
                    name: product.category.parent.category_name,
                    description: product.category.parent.description,
                    image_url: product.category.parent.image_url
                } : null
            } : null,
            shop: product.shop ? {
                id: product.shop.id,
                name: product.shop.shop_name,
                logo_url: product.shop.logo_url,
                address: product.shop.contact_address,
                email: product.shop.contact_email
            } : null,
            sizes: Array.from(sizes).sort(),
            colors: Array.from(colors).sort(),
            variants: formattedVariants,
            image_url: product.product_images[0].image_url,
            created_at: product.createdAt,
            stock_quantity: formattedVariants.reduce((sum, v) => sum + v.stock, 0)
        };
    });
};

const generateBotResponse = async (messages, searchResults) => {
    /** Chọn prompt phù hợp dựa trên kết quả tìm kiếm **/
    let systemContext = BASE_SYSTEM_PROMPT;

    if (searchResults) {
        switch (searchResults.type) {
            case 'social_only':
                systemContext = SOCIAL_PROMPT;
                break;
            case 'products':
                systemContext = PRODUCT_SEARCH_PROMPT;
                break;
            case 'shops':
                systemContext = SHOP_SEARCH_PROMPT;
                break;
        }
    }

    /** Thêm kết quả tìm kiếm vào context **/
    if (searchResults) {
        if (searchResults.type === 'products') {
            if (searchResults.data && searchResults.data.length > 0) {
                systemContext += "\n\nBelow are the products that match the user's search criteria:\n";
                searchResults.data.forEach((product, index) => {
                    systemContext += `\nProduct ${index + 1}:\n`;
                    systemContext += `- Tên: ${product.name}\n`;
                    systemContext += `- Giá: ${product.price} VNĐ\n`;
                    if (product.rating) systemContext += `- Rating: ${product.rating}/5 sao (${product.review_count} đánh giá)\n`;
                    if (product.gender) systemContext += `- Giới tính: ${product.gender}\n`;
                    if (product.sizes?.length > 0) systemContext += `- Size: ${product.sizes.join(', ')}\n`;
                    if (product.colors?.length > 0) systemContext += `- Màu: ${product.colors.join(', ')}\n`;
                    if (product.shop?.name) systemContext += `- Shop: ${product.shop.name}\n`;
                });
            } else {
                // Nếu không có kết quả, thêm message vào context
                systemContext += "\n\nNo products found matching the search criteria.";
                if (searchResults.message) {
                    systemContext += `\nMessage: ${searchResults.message}`;
                }
            }
        } else if (searchResults.type === 'shops' && searchResults.data.length > 0) {
            systemContext += "\n\nBelow are the shops that match the user's search criteria:\n";
            searchResults.data.forEach((shop, index) => {
                systemContext += `\nShop ${index + 1}:\n`;
                systemContext += `- Tên: ${shop.name}\n`;
                if (shop.email) systemContext += `- Email: ${shop.email}\n`;
                if (shop.address) systemContext += `- Địa chỉ: ${shop.address}\n`;
                if (shop.total_reviews) systemContext += `- Số lượng đánh giá: ${shop.total_reviews}\n`;
                if (shop.total_products) systemContext += `- Số lượng sản phẩm: ${shop.total_products}\n`;

                if (shop.products?.length > 0) {
                    systemContext += `- Một số sản phẩm nổi bật:\n`;
                    shop.products.forEach((product, pIndex) => {
                        systemContext += `  + Sản phẩm ${pIndex + 1}: ${product.name} - ${product.price} VND\n`;
                        if (product.sizes?.length > 0) systemContext += `    Size: ${product.sizes.join(', ')}\n`;
                        if (product.colors?.length > 0) systemContext += `    Màu: ${product.colors.join(', ')}\n`;
                    });
                }
            });
        }
    }

    // The prompt format consistent across all models
    const prompt = `
        ${systemContext}
        
        User message: ${messages[messages.length - 1].content}
        
        Please respond to the user's message based on the above instructions and context. Respond in Vietnamese only.
        
        Remember:
        1. NEVER output any English text
        2. NEVER include the words "Product" or "Shop" followed by numbers in your response
        3. Format shop/product info in natural conversational Vietnamese
        4. Do not include system phrases like "Dưới đây là", "Tôi thấy", etc.
        5. If no products are found, explain clearly that no matching products were found and suggest the user try different search terms
        6. When listing products, format them clearly with name, price, rating, sizes, colors and shop name
    `;

    /** Bắt đầu với model chính, sau đó thử các model fallback **/
    const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];

    /** Track lỗi để check nếu tất cả các model thất bại **/
    const errors = [];

    /** Thử từng model theo thứ tự cho đến khi một model hoạt động **/
    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            /** Sử dụng generateContent đơn giản để tránh cấu trúc cuộc hội thoại phức tạp **/
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(`Error with model ${modelName}:`, error.message);
            errors.push(`${modelName}: ${error.message}`);

            /** Nếu không phải lỗi hạn mức, hoặc chúng ta đang ở model cuối cùng, không tiếp tục **/
            if (!error.message.includes('quota') && !error.message.includes('429') && modelName === modelsToTry[modelsToTry.length - 1]) {
                throw error;
            }

            /** Nếu không phải lỗi hạn mức, tiếp tục với model tiếp theo **/
            console.log(`Falling back to next model...`);
        }
    }

    /** Coi như tất cả các model đều thất bại **/
    console.error('All models failed:', errors.join('; '));
    return "Xin lỗi, hiện tại tôi đang gặp sự cố kết nối. Vui lòng thử lại sau. (Các mô hình AI đã thử: " + modelsToTry.join(', ') + ")";
};

/** Xử lý tin nhắn từ người dùng khách (không lưu session ở FE) **/
export const processGuestMessage = async (userMessage, sessionId) => {
    try {
        /** Tìm kiếm sản phẩm dựa trên tin nhắn của người dùng **/
        const searchTerms = await extractSearchTerms(userMessage);
        const searchResults = await searchProductOrShop(searchTerms);

        /** Tạo response từ bot **/
        const botResponse = await generateBotResponse([{ role: 'user', content: userMessage }], searchResults);

        return {
            message: botResponse,
            searchResults: searchResults
        };
    } catch (error) {
        console.error('Error processing guest message:', error);
        throw error;
    }
};

/** Gửi tin nhắn vào một session cụ thể **/
export const sendMessageToSession = async (sessionId, userId, userMessage) => {
    try {
        // Lấy lịch sử chat của session này
        const histories = await db.ChatHistory.findAll({
            where: { session_id: sessionId },
            order: [['createdAt', 'ASC']]
        });

        // Tập hợp tất cả messages
        let messages = [];
        histories.forEach(h => {
            try {
                const arr = Array.isArray(h.messages) ? h.messages : JSON.parse(h.messages);
                messages = messages.concat(arr);
            } catch (e) {
                console.error('Error parsing messages:', e);
            }
        });

        // Thêm tin nhắn mới của user
        const userMsg = { role: 'user', content: userMessage };
        messages.push(userMsg);

        // Tìm kiếm sản phẩm
        const searchTerms = await extractSearchTerms(userMessage);
        const searchResults = await searchProductOrShop(searchTerms);

        // Tạo response từ bot
        const botResponse = await generateBotResponse(messages, searchResults);

        // Tin nhắn từ bot
        const botMsg = {
            role: 'assistant',
            content: botResponse,
            searchResults: searchResults
        };

        // Lưu tin nhắn vào history
        if (userId) {
            // Nếu là user đã đăng nhập, lưu vào ChatHistory
            await db.ChatHistory.create({
                user_id: userId,
                session_id: sessionId,
                messages: JSON.stringify([userMsg, botMsg])
            });
        } else {
            // Nếu là khách, lưu vào GuestChatHistory
            await db.sequelize.query(`
                INSERT INTO chathistories (session_id, messages, createdAt, updatedAt)
                VALUES (?, ?, NOW(), NOW())
            `, {
                replacements: [sessionId, JSON.stringify([userMsg, botMsg])],
                type: db.sequelize.QueryTypes.INSERT
            });
        }

        return {
            messages: [userMsg, botMsg]
        };
    } catch (error) {
        console.error('Error sending message to session:', error);
        throw error;
    }
};

/** Tạo session mới **/
export const createSession = async (userId, title) => {
    const session_id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Tạo session mới
    const session = await db.ChatSession.create({
        user_id: userId || null,
        session_id,
        title: title || 'Cuộc hội thoại mới'
    });

    // Tạo history rỗng cho session này
    await db.ChatHistory.create({
        user_id: userId || null,
        session_id: session.session_id,
        messages: JSON.stringify([])
    });

    return {
        sessionId: session.session_id,
        title: session.title,
        createdAt: session.createdAt
    };
};

/** Lấy danh sách session **/
export const getSessions = async (userId, sessionIds) => {
    let where = {};

    if (userId) {
        // Nếu có userId -> lấy tất cả session của user đó
        where.user_id = userId;
    } else if (sessionIds) {
        // Nếu không có userId nhưng có sessionIds -> lấy các session cụ thể (cho khách)
        const ids = Array.isArray(sessionIds) ? sessionIds : sessionIds.split(',');
        where.session_id = { [Op.in]: ids };
    }

    const sessions = await db.ChatSession.findAll({
        where,
        order: [['createdAt', 'DESC']]
    });

    return sessions.map(session => ({
        sessionId: session.session_id,
        title: session.title,
        createdAt: session.createdAt,
        userId: session.user_id
    }));
};

/** Lấy lịch sử chat của một session **/
export const getChatHistoryBySession = async (sessionId) => {
    const histories = await db.ChatHistory.findAll({
        where: { session_id: sessionId },
        order: [['createdAt', 'ASC']]
    });

    let messages = [];
    histories.forEach(h => {
        try {
            const arr = Array.isArray(h.messages) ? h.messages : JSON.parse(h.messages);
            messages = messages.concat(arr);
        } catch (e) {
            console.error('Error parsing messages:', e);
        }
    });

    return messages.map((msg, idx) => ({
        id: msg.id || `${msg.role}-${idx}-${Date.now()}`,
        text: msg.content,
        isUser: msg.role === 'user',
        searchResults: msg.searchResults
    }));
};
