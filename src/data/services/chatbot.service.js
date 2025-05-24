import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../models';
import { Op } from 'sequelize';
import { sequelize } from '../models';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Default model is gemini-1.5-pro
const PRIMARY_MODEL = "gemini-1.5-flash";
// Fallback models in case of quota issues - only use models available in v1beta
const FALLBACK_MODELS = ["gemini-1.5-flash"]; // Removing unavailable models

// Base system prompt for the chatbot
const BASE_SYSTEM_PROMPT = `You are a helpful shopping assistant for an online clothing store. Your name is ClothesShop Assistant.

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
11. If you don't have specific data about something, provide a general response without mentioning that you don't have access to a database.`;

// Product-specific prompt
const PRODUCT_SEARCH_PROMPT = `${BASE_SYSTEM_PROMPT}

Khi trả lời về sản phẩm:

1. Trả lời trực tiếp:
   - Nếu tìm thấy: "Đây là [số lượng] sản phẩm phù hợp:"
   - Nếu không tìm thấy: "Không tìm thấy sản phẩm [mô tả]. Vui lòng thử tìm kiếm khác."
   - Nếu có category: "Các sản phẩm thuộc [tên category]:"

2. Format sản phẩm:
   - [Tên sản phẩm]
   - Giá: [giá] VND
   - Rating: [X/5 sao] ([số lượng] đánh giá)
   - Size: [danh sách size]
   - Màu: [danh sách màu]
   - Shop: [tên shop]

3. Quy tắc:
   - KHÔNG hỏi thêm thông tin
   - KHÔNG giải thích kết quả
   - KHÔNG gợi ý tìm kiếm khác
   - KHÔNG dùng từ "sản phẩm số X"
`;

// Shop-specific prompt
const SHOP_SEARCH_PROMPT = `${BASE_SYSTEM_PROMPT}

When showing shop information:
1. Present shop details in a friendly, informative way
2. Include shop name, contact info, and ratings if available
3. Mention total number of products and reviews
4. Highlight shop's specialties or popular items
5. If showing shop products, present them as examples
6. Include shop ratings and customer feedback if available
7. Mention shop policies or special features`;

// Social interaction prompt
const SOCIAL_PROMPT = `${BASE_SYSTEM_PROMPT}

For social interactions:
1. Keep responses short and natural
2. Match the user's tone and energy
3. Use casual but polite Vietnamese
4. Don't force the conversation back to shopping
5. Respond to gratitude with warmth
6. Use appropriate Vietnamese social phrases`;

// Add temporary storage for guest sessions
const guestSessions = {};
const GUEST_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes timeout

// Cache cho color keywords
let colorKeywordsCache = null;
let lastColorFetch = null;
const COLOR_CACHE_DURATION = 5 * 60 * 1000; // 5 phút

/** Lấy danh sách màu sắc từ database với cache **/
const getColorKeywords = async () => {
    // Kiểm tra cache
    if (colorKeywordsCache && lastColorFetch && (Date.now() - lastColorFetch < COLOR_CACHE_DURATION)) {
        return colorKeywordsCache;
    }

    try {
        const colors = await db.Color.findAll({
            attributes: ['color_name']
        });

        // Cập nhật cache
        colorKeywordsCache = colors.map(color => color.color_name.toLowerCase());
        lastColorFetch = Date.now();

        return colorKeywordsCache;
    } catch (error) {
        console.error('Error fetching colors:', error);
        // Fallback colors nếu không lấy được từ database
        return [
            'đen', 'trắng', 'đỏ', 'xanh',
            'vàng', 'cam', 'tím', 'hồng',
            'nâu', 'xám', 'bạc', 'vàng gold',
            'xanh dương', 'xanh lá'
        ];
    }
};

// Initialize or get an existing chat history
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
        const searchResults = await searchProducts(searchTerms);

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

/** Xác định loại tìm kiếm từ message của người dùng **/
const determineSearchType = (message) => {
    const lowerMessage = message.toLowerCase();

    /** Từ khóa social **/
    const socialPhrases = [
        'cảm ơn', 'thanks', 'thank', 'cám ơn', 'ok', 'oke', 'được', 'hay', 'tốt', 'good', 'nice',
        'tuyệt vời', 'great', 'hello', 'hi', 'xin chào', 'chào', 'bye', 'tạm biệt',
        'vâng', 'ừ', 'đúng', 'sai', 'không', 'yes', 'no', 'cool', 'wow', 'amazing',
        'chuẩn', 'đỉnh', 'quá xịn', 'xuất sắc', 'quá đã', 'quá tốt', 'hiểu rồi'
    ];

    /** Từ khóa shop **/
    const shopKeywords = [
        'cửa hàng', 'shop', 'store', 'brand', 'thương hiệu', 'hiệu', 'tiệm',
        'nơi bán', 'chỗ bán', 'hãng'
    ];

    /** Từ khóa sản phẩm **/
    const productKeywords = [
        'sản phẩm', 'mặt hàng', 'item', 'đồ', 'quần áo', 'trang phục',
        'áo', 'quần', 'váy', 'đầm', 'giày', 'dép', 'túi', 'ví', 'mũ', 'nón', 'kính',
        'vòng', 'dây', 'nhẫn', 'đồng hồ', 'phụ kiện', 'khăn', 'tất', 'vớ'
    ];

    /** Kiểm tra xem đây có phải là tương tác social không **/
    if (socialPhrases.some(phrase => {
        const regex = new RegExp(`(^|\\s)${phrase}(\\s|$|[,.!?;:])`, 'i');
        return regex.test(lowerMessage);
    }) && message.length < 20) {
        return 'social';
    }

    /** Kiểm tra xem đây có phải là tìm kiếm shop không **/
    const isShopQuery = shopKeywords.some(keyword => lowerMessage.includes(keyword));

    /** Kiểm tra xem đây có phải là tìm kiếm sản phẩm không **/
    const hasProductKeyword = productKeywords.some(keyword => lowerMessage.includes(keyword));

    /** Nếu đây là tìm kiếm shop và có intent tìm kiếm sản phẩm **/
    if (isShopQuery && hasProductKeyword) {
        return 'shop_products';
    }

    /** Nếu đây là tìm kiếm shop **/
    else if (isShopQuery) {
        return 'shop_info';
    }

    /** Mặc định là tìm kiếm sản phẩm **/
    else {
        return 'product';
    }
};

/** Tìm danh mục dựa trên từ khóa **/
const findCategories = async (keyword) => {
    try {
        // Tìm tất cả danh mục có tên chứa từ khóa
        const categories = await db.Category.findAll({
            where: {
                category_name: {
                    [Op.like]: `%${keyword}%`
                }
            },
            include: [
                {
                    model: db.Category,
                    as: 'parent',
                    attributes: ['id', 'category_name']
                },
                {
                    model: db.Category,
                    as: 'children',
                    attributes: ['id', 'category_name']
                }
            ]
        });

        // Tập hợp tất cả ID danh mục liên quan
        const categoryIds = new Set();
        categories.forEach(category => {
            categoryIds.add(category.id);
            // Nếu là danh mục cha, thêm ID của các danh mục con
            if (category.children && category.children.length > 0) {
                category.children.forEach(child => categoryIds.add(child.id));
            }
            // Nếu là danh mục con, thêm ID của danh mục cha
            if (category.parent) {
                categoryIds.add(category.parent.id);
            }
        });

        return Array.from(categoryIds);
    } catch (error) {
        console.error('Error finding categories:', error);
        return [];
    }
};

/** Tìm kiếm sản phẩm **/
const searchProducts = async (searchTerms) => {
    try {
        // Log để debug
        console.log('Search terms:', searchTerms);

        // Kiểm tra searchTerms
        if (!searchTerms || typeof searchTerms !== 'object') {
            console.error('Invalid searchTerms:', searchTerms);
            return { type: 'error', message: 'Invalid search terms' };
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

        // console.log('Search query:', JSON.stringify(query, null, 2)); // Debug log

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
const searchShops = async (searchTerms, includeProducts = false) => {
    try {
        const query = {
            where: {}
        };

        if (searchTerms.shopName) {
            query.where.shop_name = {
                [Op.like]: `%${searchTerms.shopName}%`
            };
        }

        const shops = await db.Shop.findAll(query);

        /** Nếu không tìm thấy shop nhưng yêu cầu sản phẩm **/
        if (shops.length === 0 && includeProducts) {
            const fallbackShops = await db.Shop.findAll({ limit: 3 });
            return await formatShopResults(fallbackShops, true);
        }

        return await formatShopResults(shops, includeProducts);
    } catch (error) {
        console.error('Shop search error:', error);
        return { type: 'error', message: error.message };
    }
};

/** Format kết quả shop **/
const formatShopResults = async (shops, includeProducts = false) => {
    const formattedShops = [];

    for (const shop of shops) {
        const shopData = {
            id: shop.id,
            name: shop.shop_name,
            email: shop.contact_email,
            address: shop.contact_address,
            logo_url: shop.logo_url
        };

        /** Thêm thông tin shop khác **/
        const [productCount, reviewStats] = await Promise.all([
            db.Product.count({ where: { shop_id: shop.id } }),
            db.Review.findOne({
                attributes: [
                    [db.sequelize.fn('AVG', db.sequelize.col('star_point')), 'avg_rating'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_reviews']
                ],
                where: { shop_id: shop.id }
            })
        ]);

        shopData.total_products = productCount || 0;
        shopData.avg_rating = reviewStats && reviewStats.dataValues.avg_rating
            ? parseFloat(reviewStats.dataValues.avg_rating).toFixed(1)
            : "Chưa có đánh giá";
        shopData.total_reviews = reviewStats ? reviewStats.dataValues.total_reviews : 0;

        /** Nếu yêu cầu sản phẩm **/
        if (includeProducts) {
            const products = await db.Product.findAll({
                where: { shop_id: shop.id },
                limit: 3,
                include: [
                    {
                        model: db.ProductImages,
                        as: 'product_images',
                    },
                    {
                        model: db.ProductVariant,
                        as: 'variants',
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
                    }
                ]
            });
            shopData.products = formatProductsForResponse(products);
        }

        formattedShops.push(shopData);
    }

    return { type: 'shops', data: formattedShops };
};

/** Tách từ khóa tìm kiếm từ message **/
const extractSearchTerms = async (message) => {
    if (!message || typeof message !== 'string') {
        return {
            categoryIds: [],
            name: '',
            isSocialOnly: false
        };
    }

    /** Chuyển message thành chữ thường để dễ dàng so sánh **/
    let processedMessage = message.toLowerCase();

    const searchTerms = {
        categoryIds: [],
        name: '',
        keywords: '',
        isShopSearch: false,
        isSocialOnly: false,
        requiresGoodRating: false
    };

    // Kiểm tra từ khóa xã giao
    const socialPhrases = [
        'cảm ơn', 'thanks', 'thank', 'cám ơn', 'ok', 'oke', 'được', 'hay', 'tốt', 'good', 'nice',
        'tuyệt vời', 'great', 'hello', 'hi', 'xin chào', 'chào', 'bye', 'tạm biệt',
        'vâng', 'ừ', 'đúng', 'sai', 'không', 'yes', 'no', 'cool', 'wow', 'amazing',
        'chuẩn', 'đỉnh', 'quá xịn', 'xuất sắc', 'quá đã', 'quá tốt', 'hiểu rồi'
    ];

    const isSocialPhrase = socialPhrases.some(phrase => {
        const regex = new RegExp(`(^|\\s)${phrase}(\\s|$|[,.!?;:])`, 'i');
        return regex.test(processedMessage);
    });

    if (isSocialPhrase && processedMessage.length < 20) {
        searchTerms.isSocialOnly = true;
        return searchTerms;
    }

    // Kiểm tra tìm kiếm shop
    const shopKeywords = [
        'cửa hàng', 'shop', 'store', 'brand', 'thương hiệu', 'hiệu', 'tiệm',
        'nơi bán', 'chỗ bán', 'hãng'
    ];

    if (shopKeywords.some(keyword => processedMessage.includes(keyword))) {
        searchTerms.isShopSearch = true;
        const shopNameMatch = message.match(new RegExp(`(${shopKeywords.join('|')})\\s+([\\w\\s]+)`, 'i'));
        if (shopNameMatch && shopNameMatch[2]) {
            searchTerms.shopName = shopNameMatch[2].trim();
        }
        return searchTerms;
    }

    try {
        // Tách giá
        const priceKeywords = [
            'dưới', 'under', 'less than', 'không quá',
            'từ', 'from', 'đến', 'to',
            'k', 'nghìn', 'ngàn', 'triệu', 'tr',
            'giá', 'price', 'khoảng', 'tầm', 'range'
        ];
        const priceRegex = /(dưới|under|less than|không quá)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)|(từ|from)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\s*(đến|to)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)|(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\s*(đến|to)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)/i;

        const priceMatch = processedMessage.match(priceRegex);
        if (priceMatch) {
            // Hàm chuyển đổi text giá thành số
            const parsePrice = (priceText) => {
                if (!priceText) return null;

                // Chuẩn hóa text
                priceText = priceText.toLowerCase().trim()
                    .replace(/\s+/g, '')
                    .replace(/,/g, '');

                let multiplier = 1;
                let number;

                // Xử lý các đơn vị
                if (priceText.includes('tr') || priceText.includes('triệu')) {
                    multiplier = 1000000;
                    number = parseFloat(priceText.replace(/(tr|triệu)/, ''));
                } else if (priceText.includes('k') || priceText.includes('nghìn') || priceText.includes('ngàn')) {
                    multiplier = 1000;
                    number = parseFloat(priceText.replace(/(k|nghìn|ngàn)/, ''));
                } else {
                    number = parseFloat(priceText);
                }

                return number * multiplier;
            };

            if (priceMatch[1]) {
                // Pattern: "dưới/không quá X"
                searchTerms.maxPrice = parsePrice(priceMatch[2]);
            } else if (priceMatch[4]) {
                // Pattern: "từ X đến Y"
                searchTerms.minPrice = parsePrice(priceMatch[5]);
                searchTerms.maxPrice = parsePrice(priceMatch[8]);
            } else if (priceMatch[10]) {
                // Pattern: "X đến Y"
                searchTerms.minPrice = parsePrice(priceMatch[10]);
                searchTerms.maxPrice = parsePrice(priceMatch[13]);
            }

            // Đảm bảo minPrice < maxPrice
            if (searchTerms.minPrice && searchTerms.maxPrice && searchTerms.minPrice > searchTerms.maxPrice) {
                [searchTerms.minPrice, searchTerms.maxPrice] = [searchTerms.maxPrice, searchTerms.minPrice];
            }

            // Lọc bỏ phần giá khỏi tin nhắn để tìm tên sản phẩm
            const pricePattern = priceMatch[0];
            processedMessage = processedMessage.replace(pricePattern, ' ').trim();

            // Lọc bỏ các từ khóa về giá
            const messageWords = processedMessage.split(/\s+/);
            processedMessage = messageWords
                .filter(word => !priceKeywords.includes(word))
                .join(' ')
                .trim();
        }

        // Lấy danh mục
        const categories = await db.Category.findAll({
            attributes: ['id', 'category_name', 'parentId']
        });

        // Tạo map từ khóa danh mục
        const categoryKeywords = new Map();
        categories.forEach(category => {
            const keyword = category.category_name.toLowerCase();
            categoryKeywords.set(keyword, {
                id: category.id,
                parentId: category.parentId
            });
        });

        // Tìm màu sắc
        const colors = await db.Color.findAll({
            attributes: ['id', 'color_name']
        });
        const colorKeywords = new Map();
        colors.forEach(color => {
            const keyword = color.color_name.toLowerCase();
            colorKeywords.set(keyword, {
                id: color.id,
                name: color.color_name
            });
        });

        const words = processedMessage.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
            for (let j = words.length; j > i; j--) {
                const phrase = words.slice(i, j).join(' ');
                if (colorKeywords.has(phrase)) {
                    searchTerms.color = colorKeywords.get(phrase).name;
                    break;
                }
            }
            if (searchTerms.color) break;
        }

        // Tìm danh mục
        let remainingWords = [...words];
        let foundCategories = new Set();
        for (let i = 0; i < words.length; i++) {
            for (let j = words.length; j > i; j--) {
                const phrase = words.slice(i, j).join(' ');
                if (categoryKeywords.has(phrase)) {
                    const catInfo = categoryKeywords.get(phrase);
                    // Thêm danh mục và danh mục con nếu là danh mục cha
                    searchTerms.categoryIds.push(catInfo.id);
                    if (!catInfo.parentId) {
                        categories
                            .filter(cat => cat.parentId === catInfo.id)
                            .forEach(child => searchTerms.categoryIds.push(child.id));
                    }
                    const matchedWords = phrase.split(/\s+/);
                    matchedWords.forEach(word => foundCategories.add(word));
                    break;
                }
            }
        }

        // Tìm tên sản phẩm
        const productNamePatterns = [
            /(?:sản phẩm|mặt hàng|món hàng|đồ|item)\s+(?:tên|gọi|là|có tên|tên là|gọi là)\s+(?:(?:tôi|cần|tìm|là)\s+)*([^ ]+(?:\s+[^ ]+)*)(?:\s|$|\?|\.)/i,
            /(?:tìm|kiếm|có|bán|cần|muốn mua)\s+(?:sản phẩm|mặt hàng|món hàng|đồ|item)\s+["']([^"']+)["']/i,
            /["']([^"']+)["']\s+(?:có|còn|được|không|chưa|bán|nhỉ|nữa|vậy)(?:\s|$|\?|\.)/i,
            /tên\s+["']([^"']+)["']/i,
            /(?:sản phẩm|mặt hàng|món hàng|đồ|item)\s+([^ ]+(?:\s+[^ ]+)*)(?:\s|$|\?|\.)/i,
            /(?:tôi\s*(?:đang\s*)?(?:tìm|cần|kiếm))\s+([^ ]+(?:\s+[^ ]+)*)(?:\s|$|\?|\.)/i
        ];

        let foundExactName = false;
        const stopWords = new Set(['tôi', 'cần', 'tìm', 'sản', 'phẩm', 'tên', 'là', 'mặt', 'hàng', 'món', 'đồ', 'item', 'đang', 'các', 'loại', 'màu', ...priceKeywords]);
        for (const pattern of productNamePatterns) {
            const match = processedMessage.match(pattern);
            if (match && match[1]) {
                const potentialName = match[1].trim();
                // Lọc stopWords
                const nameWords = potentialName.toLowerCase().split(/\s+/).filter(word => !stopWords.has(word));
                let categoryPhrase = '';
                // Tìm cụm danh mục dài nhất
                for (let i = 0; i < nameWords.length; i++) {
                    for (let j = nameWords.length; j > i; j--) {
                        const phrase = nameWords.slice(i, j).join(' ');
                        if (categoryKeywords.has(phrase)) {
                            categoryPhrase = phrase;
                            break;
                        }
                    }
                    if (categoryPhrase) break;
                }
                // Loại bỏ từ thuộc danh mục và màu sắc
                const nonCategoryWords = nameWords.filter(word => !categoryPhrase.split(/\s+/).includes(word));
                const finalWords = nonCategoryWords.filter(word => !searchTerms.color || !searchTerms.color.toLowerCase().split(/\s+/).includes(word));
                const cleanedName = finalWords.join(' ').trim();
                // Chỉ gán tên nếu không có danh mục
                if (cleanedName && !categoryPhrase) {
                    searchTerms.name = cleanedName;
                    foundExactName = true;
                    break;
                }
            }
        }

        // Nếu không tìm thấy pattern và input không chứa từ khóa đặc biệt
        const specialKeywords = new Set(['sản phẩm', 'mặt hàng', 'món hàng', 'đồ', 'item', 'tìm', 'cần', 'kiếm', 'tên', 'là', 'đang', 'các', 'loại', 'màu']);
        if (!foundExactName && !processedMessage.split(/\s+/).some(word => specialKeywords.has(word))) {
            const trimmedMessage = processedMessage.trim();
            if (!categoryKeywords.has(trimmedMessage)) {
                searchTerms.name = trimmedMessage;
                foundExactName = true;
            }
        }

        // Lọc từ khóa
        remainingWords = remainingWords.filter(word =>
            !foundCategories.has(word) &&
            !stopWords.has(word) &&
            (!searchTerms.color || !searchTerms.color.toLowerCase().split(/\s+/).includes(word))
        );
        const remainingPhrase = remainingWords.join(' ').trim();
        if (!foundExactName && remainingPhrase) {
            searchTerms.keywords = remainingPhrase;
        }

        // Tách kích cỡ
        const sizeRegex = /\b(size|kích\s*cỡ|kích\s*thước)\s*(xs|s|m|l|xl|xxl|\d+)\b/i;
        const sizeMatch = message.match(sizeRegex);
        if (sizeMatch && sizeMatch[2]) {
            searchTerms.size = sizeMatch[2].toUpperCase();
        }

        // Tách giới tính
        if (processedMessage.includes('nam')) searchTerms.gender = 'Male';
        else if (processedMessage.includes('nữ')) searchTerms.gender = 'Female';
        else if (processedMessage.includes('unisex')) searchTerms.gender = 'Unisex';
        else if (processedMessage.includes('trẻ em') || processedMessage.includes('kid')) searchTerms.gender = 'Kids';

        // Kiểm tra yêu cầu chất lượng
        const qualityKeywords = [
            'đẹp', 'tốt', 'chất lượng', 'cao cấp',
            'xịn', 'sang', 'chính hãng'
        ];
        searchTerms.requiresGoodRating = qualityKeywords.some(keyword =>
            processedMessage.includes(keyword)
        );

        console.log('Search terms:', searchTerms);
        return searchTerms;
    } catch (error) {
        console.error('Error in extractSearchTerms:', error);
        return searchTerms;
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
                if (shop.avg_rating) systemContext += `- Đánh giá: ${shop.avg_rating}\n`;
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
        const searchResults = await searchProducts(searchTerms);

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
        const searchResults = await searchProducts(searchTerms);

        // Tạo response từ bot
        const botResponse = await generateBotResponse(messages, searchResults);

        // Tin nhắn từ bot
        const botMsg = {
            role: 'assistant',
            content: botResponse,
            searchResults: searchResults
        };

        // Lưu cả tin nhắn user và bot vào history
        await db.ChatHistory.create({
            user_id: userId || null,
            session_id: sessionId,
            messages: JSON.stringify([userMsg, botMsg])
        });

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
