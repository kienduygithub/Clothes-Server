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
   - Kết thúc bằng "Bạn có thể đặt hàng ngay 😊"`;

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

/** Xử lý message từ người dùng và trả về response **/
export const processMessage = async (userId, userMessage) => {
    try {
        /** Lấy lịch sử chat => Không thấy thì tạo mới **/
        let [chatHistory] = await db.ChatHistory.findOrCreate({
            where: { user_id: userId },
            defaults: {
                user_id: userId,
                messages: []
            }
        });

        /** Thêm message người dùng vào lịch sử chat **/
        const messages = chatHistory.messages || [];
        messages.push({
            role: 'user',
            content: userMessage
        });

        /** Tìm kiếm sản phẩm hoặc cửa hàng dựa trên message của người dùng **/
        const searchResults = await searchProducts(userMessage);

        /** Tạo response từ bot dựa trên message và kết quả tìm kiếm **/
        const botResponse = await generateBotResponse(messages, searchResults);

        /** Thêm response từ bot vào lịch sử chat và kết quả tìm kiếm **/
        messages.push({
            role: 'assistant',
            content: botResponse,
            searchResults: searchResults
        });

        /** Cập nhật lịch sử chat **/
        chatHistory.messages = messages;
        await chatHistory.save();

        return {
            message: botResponse,
            chatHistory: messages,
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
                    required: true,
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

        // Tìm kiếm theo danh mục và tên sản phẩm
        if (searchTerms.categoryKeyword) {
            const categoryIds = await findCategories(searchTerms.categoryKeyword);
            if (categoryIds.length > 0) {
                query.where = {
                    ...query.where,
                    [Op.or]: [
                        {
                            categoryId: {
                                [Op.in]: categoryIds
                            }
                        },
                        sequelize.where(
                            sequelize.col('category.category_name'),
                            'LIKE',
                            `%${searchTerms.categoryKeyword}%`
                        )
                    ]
                };
            }

            // Thêm điều kiện tìm theo tên sản phẩm nếu có categoryKeyword
            query.where = {
                ...query.where,
                [Op.or]: [
                    ...(query.where[Op.or] || []),
                    {
                        product_name: {
                            [Op.like]: `%${searchTerms.categoryKeyword}%`
                        }
                    }
                ]
            };
        }

        // Tìm theo tên sản phẩm (nếu có)
        if (searchTerms.name && searchTerms.name !== searchTerms.categoryKeyword) {
            query.where = {
                ...query.where,
                [Op.or]: [
                    ...(query.where[Op.or] || []),
                    {
                        product_name: {
                            [Op.like]: `%${searchTerms.name}%`
                        }
                    }
                ]
            };
        }

        // Tìm theo giới tính
        if (searchTerms.gender) {
            query.where.gender = searchTerms.gender;
        }

        // Tìm theo khoảng giá
        if (searchTerms.minPrice || searchTerms.maxPrice) {
            query.where.unit_price = {};
            if (searchTerms.minPrice) {
                query.where.unit_price[Op.gte] = searchTerms.minPrice;
            }
            if (searchTerms.maxPrice) {
                query.where.unit_price[Op.lte] = searchTerms.maxPrice;
            }
        }

        // Tìm theo rating
        if (searchTerms.requiresGoodRating) {
            query.having = sequelize.literal('rating >= 4.0');
        }

        /** Thực hiện tìm kiếm **/
        let products = await db.Product.findAll(query);

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

        return {
            type: 'products',
            data: formatProductsForResponse(limitedProducts),
            total: products.length,
            categoryInfo: searchTerms.categoryKeyword ? { name: searchTerms.categoryKeyword } : null
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

/** Hàm tìm kiếm chính **/
const performSearch = async (userMessage) => {
    const searchTerms = extractSearchTerms(userMessage);
    if (!searchTerms) return null;

    const searchType = determineSearchType(userMessage);

    switch (searchType) {
        case 'social':
            return { type: 'social_only', data: [] };
        case 'shop_products':
            return await searchShops(searchTerms, true);
        case 'shop_info':
            return await searchShops(searchTerms, false);
        case 'product':
            return await searchProducts(searchTerms);
        default:
            return null;
    }
};

/** Tách từ khóa tìm kiếm từ message **/
const extractSearchTerms = (message) => {
    /** Chuyển message thành chữ thường để dễ dàng so sánh **/
    const lowerMessage = message.toLowerCase();

    // Object to store search terms
    const searchTerms = {};

    /** Kiểm tra các từ khóa xã giao **/
    const socialPhrases = [
        'cảm ơn', 'thanks', 'thank', 'cám ơn', 'ok', 'oke', 'được', 'hay', 'tốt', 'good', 'nice',
        'tuyệt vời', 'great', 'hello', 'hi', 'xin chào', 'chào', 'bye', 'tạm biệt',
        'vâng', 'ừ', 'đúng', 'sai', 'không', 'yes', 'no', 'cool', 'wow', 'amazing',
        'chuẩn', 'đỉnh', 'quá xịn', 'xuất sắc', 'quá đã', 'quá tốt', 'hiểu rồi'
    ];

    /** Phát hiện từ khóa xã giao riêng lẻ **/
    const isSocialPhrase = socialPhrases.some(phrase => {
        /** Kiểm tra xem message có chứa đúng từ đó không (cách nhau bởi dấu cách hoặc đầu/cuối chuỗi) **/
        const regex = new RegExp(`(^|\\s)${phrase}(\\s|$|[,.!?;:])`, 'i');
        return regex.test(lowerMessage);
    });

    /** Nếu chỉ có từ xã giao và không có từ khóa khác, đánh dấu là social_only **/
    if (isSocialPhrase && lowerMessage.length < 20) {
        searchTerms.isSocialOnly = true;
        return searchTerms;
    }

    /** Định nghĩa các loại từ khóa **/
    const categoryKeywords = {
        'áo': ['áo', 'áo thun', 'áo sơ mi', 'áo khoác', 'áo len', 'áo hoodie'],
        'quần': ['quần', 'quần jean', 'quần kaki', 'quần short', 'quần tây'],
        'váy': ['váy', 'đầm', 'chân váy', 'váy công sở', 'váy dự tiệc'],
        'giày dép': ['giày', 'dép', 'sandal', 'giày thể thao', 'giày cao gót'],
        'phụ kiện': ['phụ kiện', 'túi', 'ví', 'thắt lưng', 'mũ', 'nón', 'kính', 'trang sức']
    };

    /** Tìm danh mục từ từ khóa **/
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                searchTerms.categoryKeyword = category;
                searchTerms.name = keyword; // Lưu từ khóa cụ thể làm tên tìm kiếm
                break;
            }
        }
        if (searchTerms.categoryKeyword) break;
    }

    /** Định nghĩa các loại từ khóa khác **/
    const shopKeywords = [
        'cửa hàng', 'shop', 'store',
        'tiệm', 'nơi bán', 'chỗ bán',
        'hãng', 'brand', 'thương hiệu',
    ];

    const productKeywords = [
        'sản phẩm', 'mặt hàng', 'item', 'đồ', 'quần áo', 'trang phục',
        'áo', 'quần', 'váy', 'đầm', 'giày', 'dép', 'túi', 'ví', 'mũ', 'nón', 'kính',
        'vòng', 'dây', 'nhẫn', 'đồng hồ', 'phụ kiện', 'khăn', 'tất', 'vớ',
        'bán', 'mua', 'order', 'đặt hàng', 'có bán', 'đang bán', 'mẫu mã', 'sản xuất',
        'collection', 'bộ sưu tập', 'dòng', 'loại', 'mẫu', 'mẫu mã', 'mẫu mã sản phẩm',
    ];

    const infoKeywords = [
        'thông tin', 'chi tiết', 'giới thiệu', 'mô tả', 'tổng quan', 'profile',
        'địa chỉ', 'liên hệ', 'contact', 'hotline', 'email', 'số điện thoại', 'website',
        'fanpage', 'facebook', 'instagram', 'mạng xã hội', 'socials',
        'thành lập', 'lịch sử', 'xuất xứ', 'nguồn gốc', 'giờ mở cửa', 'nơi sản xuất',
        'chất lượng', 'uy tín', 'đánh giá', 'review', 'feedback', 'nhận xét', 'phản hồi',
        'chính sách', 'bảo hành', 'đổi trả', 'giao hàng', 'thanh toán', 'delivery', 'shipping',
        'giấy phép', 'chứng nhận', 'thông tin liên hệ', 'quy mô', 'nhân viên', 'danh tiếng',
        'mấy giờ mở cửa', 'họ bán gì', 'họ là ai'
    ];

    // Kiểm tra các pattern phổ biến về sản phẩm của shop
    const shopProductPatterns = [
        'sản phẩm của (cửa hàng|shop|thương hiệu|hiệu|tiệm|hãng)',
        'các sản phẩm của',
        'mặt hàng của',
        'đồ của',
        'bán gì',
        'có những gì',
        'có gì',
        'sản xuất gì',
        'có sản phẩm gì',
        'có mặt hàng gì',
        'bán những gì'
    ];

    /** Check 1: Tìm kiếm shop products theo pattern đặc thù **/
    for (const pattern of shopProductPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lowerMessage)) {
            searchTerms.isShopSearch = true;
            searchTerms.wantsShopProducts = true;

            /** Tách tên shop **/
            const shopMatches = [
                /sản phẩm của (\w+\s?\w*)/i,
                /đồ của (\w+\s?\w*)/i,
                /hàng của (\w+\s?\w*)/i,
                /cửa hàng (\w+\s?\w*) bán/i,
                /shop (\w+\s?\w*) bán/i
            ];

            for (const shopRegex of shopMatches) {
                const match = message.match(shopRegex);
                if (match && match[1]) {
                    searchTerms.shopName = match[1].trim();
                    break;
                }
            }

            break;
        }
    }

    /** Check 2: Tiếp tục check theo cách thông thường nếu chưa tìm thấy **/
    if (!searchTerms.isShopSearch && shopKeywords.some(keyword => lowerMessage.includes(keyword))) {
        searchTerms.isShopSearch = true;

        /** Phân biệt giữa tìm sản phẩm của shop và thông tin shop **/
        const hasProductIntent = productKeywords.some(keyword => lowerMessage.includes(keyword));
        const hasInfoIntent = infoKeywords.some(keyword => lowerMessage.includes(keyword));

        if (hasProductIntent) {
            /** Nếu có từ khóa liên quan đến sản phẩm, đánh dấu là tìm sản phẩm của shop **/
            searchTerms.wantsShopProducts = true;
        } else if (hasInfoIntent || !hasProductIntent) {
            /** Nếu có từ khóa thông tin hoặc không có từ khóa sản phẩm, mặc định là tìm thông tin shop **/
            searchTerms.wantsShopInfo = true;
        }

        /** Tách tên shop bằng các pattern khác nhau **/
        let shopName = null;

        /** Thử tìm kiếm sau từ khóa shop **/
        for (const keyword of shopKeywords) {
            if (lowerMessage.includes(keyword)) {
                const regex = new RegExp(`${keyword}\\s+([\\w\\s]+)`, 'i');
                const match = message.match(regex);
                if (match && match[1]) {
                    shopName = match[1].trim();
                    break;
                }
            }
        }

        /** Thử tìm kiếm sau từ khóa sản phẩm của shop **/
        if (!shopName) {
            const productOfPatterns = ['của\\s+([\\w\\s]+)', 'từ\\s+([\\w\\s]+)', 'tại\\s+([\\w\\s]+)', 'ở\\s+([\\w\\s]+)'];

            for (const pattern of productOfPatterns) {
                const regex = new RegExp(pattern, 'i');
                const match = message.match(regex);
                if (match && match[1]) {
                    shopName = match[1].trim();
                    break;
                }
            }
        }

        // Check 3: Nếu không tìm thấy tên shop cụ thể nhưng có từ khóa sản phẩm và cửa hàng
        // thì giả định muốn xem tất cả sản phẩm của một cửa hàng bất kỳ
        if (!shopName && hasProductIntent && lowerMessage.includes('sản phẩm') && shopKeywords.some(kw => lowerMessage.includes(kw))) {
            searchTerms.wantsShopProducts = true;
            searchTerms.wantsShopInfo = false;
        }

        /** Nếu tìm thấy tên shop, làm sạch nó **/
        if (shopName) {
            /** Loại bỏ từ lặp lại **/
            shopName = shopName.replace(/\s+(nào|đó|không|nhỉ|vậy|thế|ạ|a|nhé|nha|đi|ở|này)(\s+|$)/gi, ' ').trim();
            /** Loại bỏ dấu câu ở cuối **/
            shopName = shopName.replace(/[.,?!;:]+$/, '').trim();
            searchTerms.shopName = shopName;
        }
    }

    /** Nếu không tìm kiếm shop, giả định tìm sản phẩm **/
    if (!searchTerms.isShopSearch) {
        /** Tách tên sản phẩm **/
        const nameKeywords = [
            'áo', 'quần', 'váy', 'đầm',
            'giày', 'dép', 'túi', 'ví',
            'mũ', 'nón', 'kính', 'trang phục',
            'phụ kiện', 'vòng cổ', 'thắt lưng', 'đồng hồ',
            'khăn', 'tất', 'vớ'
        ];

        for (const keyword of nameKeywords) {
            if (lowerMessage.includes(keyword)) {
                const regex = new RegExp(`${keyword}\\s+([\\w\\s]+)`, 'i');
                const match = message.match(regex);
                if (match && match[1]) {
                    searchTerms.name = keyword + ' ' + match[1].trim();
                    break;
                } else {
                    searchTerms.name = keyword;
                }
            }
        }

        /** Tách kích cỡ **/
        const sizeRegex = /\b(size|kích\s*cỡ|kích\s*thước)\s*(xs|s|m|l|xl|xxl|\d+)\b/i;
        const sizeMatch = message.match(sizeRegex);
        if (sizeMatch && sizeMatch[2]) {
            searchTerms.size = sizeMatch[2];
        }

        /** Tách màu sắc **/
        const colorKeywords = [
            'đen', 'trắng', 'đỏ', 'xanh',
            'vàng', 'cam', 'tím', 'hồng',
            'nâu', 'xám', 'bạc', 'vàng gold',
            'xanh dương', 'xanh lá'
        ];
        for (const color of colorKeywords) {
            if (lowerMessage.includes(color)) {
                searchTerms.color = color;
                break;
            }
        }

        /** Tách giới tính **/
        if (lowerMessage.includes('nam')) searchTerms.gender = 'Male';
        else if (lowerMessage.includes('nữ')) searchTerms.gender = 'Female';
        else if (lowerMessage.includes('unisex')) searchTerms.gender = 'Unisex';
        else if (lowerMessage.includes('trẻ em') || lowerMessage.includes('kid')) searchTerms.gender = 'Kids';

        /** Hàm chuyển đổi chuỗi giá thành giá trị số **/
        const convertPrice = (priceStr) => {
            priceStr = priceStr.trim().toLowerCase();
            let multiplier = 1;

            /** Kiểm tra k, nghìn, ngàn (nghìn) **/
            if (priceStr.endsWith('k') || priceStr.endsWith('nghìn') || priceStr.endsWith('ngàn')) {
                multiplier = 1000;
                priceStr = priceStr.replace(/k$|nghìn$|ngàn$/i, '').trim();
            }
            /** Kiểm tra tr, triệu (triệu) **/
            else if (priceStr.endsWith('tr') || priceStr.endsWith('triệu')) {
                multiplier = 1000000;
                priceStr = priceStr.replace(/tr$|triệu$/i, '').trim();
            }

            /** Loại bỏ dấu phẩy, chấm trong số **/
            priceStr = priceStr.replace(/\./g, '').replace(/,/g, '');

            /** Parse số **/
            const num = parseFloat(priceStr);
            if (!isNaN(num)) {
                return num * multiplier;
            }
            return null;
        };

        /** Mẫu tách giá nâng cao **/
        // 1. Standard format: dưới/từ X đến Y
        const rangeRegex = /(dưới|under|less than|không quá)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)|(từ|from)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\s*(đến|to)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)|(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\s*(đến|to)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)/i;

        /** Mẫu tách giá trị trực tiếp: 100k, 100 nghìn, 1tr, 1.5 triệu, etc. **/
        const directPriceRegex = /\b(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\b/i;

        /** Thử tìm kiếm dải giá trước tiên **/
        const rangeMatch = lowerMessage.match(rangeRegex);
        if (rangeMatch) {
            if (rangeMatch[1] && rangeMatch[2]) {  // "dưới X"
                searchTerms.maxPrice = convertPrice(rangeMatch[2]);
            } else if (rangeMatch[4] && rangeMatch[5] && rangeMatch[8]) {  // "từ X đến Y"
                searchTerms.minPrice = convertPrice(rangeMatch[5]);
                searchTerms.maxPrice = convertPrice(rangeMatch[8]);
            } else if (rangeMatch[10] && rangeMatch[13]) {  // "X đến Y"
                searchTerms.minPrice = convertPrice(rangeMatch[10]);
                searchTerms.maxPrice = convertPrice(rangeMatch[13]);
            }
        }
        /** Nếu không tìm thấy dải giá, tìm kiếm giá trị trực tiếp nếu đi kèm với từ liên quan đến giá **/
        else if (lowerMessage.match(/(giá|price|cost|tiền|khoảng|tầm|khoảng chừng|tầm khoảng)/i)) {
            const priceMatches = [...lowerMessage.matchAll(/\b(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\b/gi)];
            if (priceMatches.length === 1) {
                /** Chỉ có một giá được đề cập - giả sử đó là "xung quanh giá này" **/
                const price = convertPrice(priceMatches[0][0]);
                if (price) {
                    /** Tạo một dải giá hợp lý xung quanh giá này **/
                    searchTerms.minPrice = Math.max(0, price * 0.8); // 20% below
                    searchTerms.maxPrice = price * 1.2; // 20% above
                }
            } else if (priceMatches.length >= 2) {
                /** Nhiều giá được đề cập - giả sử đó là dải giá **/
                const prices = priceMatches.map(match => convertPrice(match[0])).filter(p => p !== null);
                if (prices.length >= 2) {
                    /** Sắp xếp giá tăng dần **/
                    prices.sort((a, b) => a - b);
                    /** Đặt giá trị tối thiểu và tối đa **/
                    searchTerms.minPrice = prices[0];
                    searchTerms.maxPrice = prices[prices.length - 1];
                }
            }
        }
    }

    /** Thêm nhận diện từ khóa về chất lượng **/
    const qualityKeywords = [
        'đẹp', 'tốt', 'chất lượng', 'cao cấp',
        'xịn', 'sang', 'chính hãng', 'chính hãng 100%'
    ];
    searchTerms.requiresGoodRating = qualityKeywords.some(keyword =>
        lowerMessage.includes(keyword)
    );

    /** Thêm xử lý khoảng giá dạng "từ X đến Y" **/
    const priceRangeMatch = message.match(/từ\s*(\d+)\s*(k|nghìn|ngàn|triệu|tr)?\s*đến\s*(\d+)\s*(k|nghìn|ngàn|triệu|tr)?/i);
    if (priceRangeMatch) {
        const startAmount = convertPrice(priceRangeMatch[1] + (priceRangeMatch[2] || ''));
        const endAmount = convertPrice(priceRangeMatch[3] + (priceRangeMatch[4] || ''));
        if (startAmount && endAmount) {
            searchTerms.minPrice = startAmount;
            searchTerms.maxPrice = endAmount;
        }
    }

    return Object.keys(searchTerms).length > 0 ? searchTerms : null;
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
    if (searchResults && searchResults.type === 'products' && searchResults.data.length > 0) {
        systemContext += "\n\nBelow are the products that match the user's search criteria:\n";
        searchResults.data.forEach((product, index) => {
            systemContext += `\nProduct ${index + 1}:\n`;
            systemContext += `- Tên: ${product.name}\n`;
            systemContext += `- Giá: ${product.price} VNĐ\n`;
            if (product.gender) systemContext += `- Giới tính: ${product.gender}\n`;
            if (product.category) systemContext += `- Danh mục: ${product.category}\n`;
            if (product.sizes?.length > 0) systemContext += `- Kích cỡ có sẵn: ${product.sizes.join(', ')}\n`;
            if (product.colors?.length > 0) systemContext += `- Màu sắc có sẵn: ${product.colors.join(', ')}\n`;
            if (product.image_url) systemContext += `- Hình ảnh: ${product.image_url}\n`;
        });
    } else if (searchResults && searchResults.type === 'shops' && searchResults.data.length > 0) {
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

/** Xử lý tin nhắn từ người dùng khách (không lưu trữ lịch sử) **/
export const processGuestMessage = async (userMessage, sessionId) => {
    try {
        /** Tạo hoặc lấy lịch sử trò chuyện tạm thời cho phiên khách này **/
        if (!sessionId) {
            sessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }

        // Initialize guest session if it doesn't exist
        if (!guestSessions[sessionId]) {
            guestSessions[sessionId] = {
                messages: [
                    /** Thêm lời chào ban đầu **/
                    {
                        role: 'assistant',
                        content: 'Xin chào! Tôi là ClothesShop Assistant. Tôi có thể giúp bạn tìm kiếm quần áo, phụ kiện và trả lời các câu hỏi về sản phẩm của chúng tôi.'
                    }
                ],
                lastAccessed: Date.now()
            };

            /** Đặt timeout để xóa phiên khách này **/
            setTimeout(() => {
                delete guestSessions[sessionId];
            }, GUEST_SESSION_TIMEOUT);
        }

        /** Cập nhật thời gian truy cập **/
        guestSessions[sessionId].lastAccessed = Date.now();

        /** Thêm tin nhắn người dùng vào phiên khách tạm thời **/
        guestSessions[sessionId].messages.push({
            role: 'user',
            content: userMessage
        });

        /** Tìm kiếm sản phẩm hoặc cửa hàng dựa trên tin nhắn của người dùng **/
        const searchResults = await searchProducts(userMessage);

        /** Tạo response từ bot với Gemini **/
        const botResponse = await generateBotResponse(guestSessions[sessionId].messages, searchResults);

        /** Thêm response từ bot vào phiên khách tạm thời với kết quả tìm kiếm **/
        guestSessions[sessionId].messages.push({
            role: 'assistant',
            content: botResponse,
            searchResults: searchResults
        });

        /** Trả về response và kết quả tìm kiếm (nhưng không lưu trữ bất cứ điều gì vĩnh viễn) **/
        return {
            message: botResponse,
            searchResults: searchResults,
            sessionId: sessionId,
            chatHistory: guestSessions[sessionId].messages
        };
    } catch (error) {
        console.error('Error processing guest message:', error);
        throw error;
    }
};

/** Lấy lịch sử trò chuyện khách tạm thời **/
export const getGuestChatHistory = (sessionId) => {
    if (!sessionId || !guestSessions[sessionId]) {
        return {
            messages: [{
                role: 'assistant',
                content: 'Xin chào! Tôi là ClothesShop Assistant. Tôi có thể giúp bạn tìm kiếm quần áo, phụ kiện và trả lời các câu hỏi về sản phẩm của chúng tôi.'
            }],
            sessionId: sessionId || `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        };
    }

    /** Cập nhật thời gian truy cập **/
    guestSessions[sessionId].lastAccessed = Date.now();

    return {
        messages: guestSessions[sessionId].messages,
        sessionId: sessionId
    };
};

export const createSession = async (userId, title) => {
    const session_id = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const session = await db.ChatSession.create({
        user_id: userId || null,
        session_id,
        title: title || 'Cuộc hội thoại mới'
    });

    // Không thêm tin nhắn chào nữa
    await db.ChatHistory.create({
        user_id: userId || null,
        session_id: session.session_id,
        messages: JSON.stringify([]) // Mảng rỗng
    });

    return { sessionId: session.session_id, title: session.title, createdAt: session.createdAt };
};

export const getSessions = async (userId, sessionIds) => {
    let results = [];
    if (userId) {
        results = await db.ChatSession.findAll({ where: { user_id: userId } });
    } else if (sessionIds) {
        const ids = Array.isArray(sessionIds) ? sessionIds : sessionIds.split(',');
        results = await db.ChatSession.findAll({ where: { session_id: { [Op.in]: ids } } });
    }

    /** Map lại để đảm bảo luôn có sessionId (dùng session_id) **/
    return results.map(session => {
        const sessionData = session.toJSON ? session.toJSON() : session;
        return {
            ...sessionData,
            sessionId: sessionData.session_id // Đảm bảo luôn có sessionId từ session_id
        };
    });
};

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
        } catch (e) { }
    });

    // Không thêm tin nhắn chào mặc định nữa
    const mapped = (messages || []).map((msg, idx) => ({
        id: msg.id || `${msg.role}-${idx}-${Date.now()}`,
        text: msg.content,
        isUser: msg.role === 'user',
        searchResults: msg.searchResults || undefined
    }));
    return mapped;
};

export const sendMessageToSession = async (sessionId, userId, userMessage) => {
    /** Lấy lịch sử chat hiện tại **/
    const histories = await db.ChatHistory.findAll({
        where: { session_id: sessionId },
        order: [['createdAt', 'ASC']]
    });
    let messages = [];
    histories.forEach(h => {
        try {
            const arr = Array.isArray(h.messages) ? h.messages : JSON.parse(h.messages);
            messages = messages.concat(arr);
        } catch (e) { }
    });
    /** Thêm tin nhắn user **/
    messages.push({ role: 'user', content: userMessage });

    /** Gọi AI hoặc search thực tế **/
    const searchResults = await searchProducts(userMessage); // dùng lại hàm searchProducts nếu có
    const botResponse = await generateBotResponse(messages, searchResults); // dùng lại hàm generateBotResponse nếu có

    /** Tin nhắn mới từ bot **/
    const botMessage = { role: 'assistant', content: botResponse, searchResults };
    messages.push(botMessage);

    /** Lưu lại bản ghi mới **/
    await db.ChatHistory.create({
        user_id: userId || null,
        session_id: sessionId,
        messages: JSON.stringify([
            { role: 'user', content: userMessage },
            botMessage
        ])
    });

    /** Chỉ trả về tin nhắn mới, không trả về toàn bộ lịch sử **/
    return {
        messages: [
            { role: 'user', content: userMessage },
            botMessage
        ]
    };
};
