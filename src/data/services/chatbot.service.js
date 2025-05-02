import models from '../models';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ResponseModel } from '../../common/errors/response';
import HttpErrors from '../../common/errors/http-errors';
import { Op } from 'sequelize';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const {
    User,
    Product,
    ProductVariant,
    ProductImages,
    Category,
    ChatHistory,
    Color,
    Size
} = models;

const sanitizeInput = (input) => {
    /** Loại bỏ ký tự đặc biệt, giữ lại dấu tiếng việt **/
    return input.replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export const sendMessage = async (message, user_id) => {
    try {
        if (!message || !user_id) {
            ResponseModel.error(HttpErrors.BAD_REQUEST, 'Thiếu thông tin cần thiết', {
                message: message ?? '',
                user_id: user_id ?? ''
            })
        }

        const sanitizedMessage = sanitizeInput(message);

        /** Lấy lịch sử chat **/
        const chatHistory = await getChatHistoryFromDB(user_id);

        /** Khỏi tạo Gemini model **/
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        /** Cải thiện prompt hệ thống **/
        const prompt = `
            Bạn là trợ lý mua sắm chuyên nghiệp cho cửa hàng quần áo. Hãy tuân thủ các nguyên tắc sau:
                1. Trả lời ngắn gọn, rõ ràng và chính xác bằng tiếng Việt
                2. Chỉ trả lời về quần áo, thời trang và các chủ đề liên quan đến cửa hàng
                3. Khi không biết câu trả lời, hãy nói "Tôi không có thông tin về vấn đề này"
                4. Không tự tạo thông tin về sản phẩm không có trong dữ liệu cửa hàng
                5. Khi người dùng hỏi về sản phẩm cụ thể, hãy nhấn mạnh vào đặc điểm, kích cỡ, màu sắc và giá cả
                6. Luôn giữ cuộc trò chuyện thân thiện, lịch sự và chuyên nghiệp
        `;

        const parts = [{ text: prompt }];

        /** Phân loại ý định người dùng chi tiết hơn **/
        const intentPatterns = {
            productSearch: ["tìm", "kiếm", "có", "đang tìm", "muốn mua", "cho xem", "ở đâu", "bán", "giá bao nhiêu"],
            productInfo: ["thông tin", "chi tiết", "mô tả", "đặc điểm", "kích cỡ", "màu"],
            storeLoc: ["cửa hàng", "chi nhánh", "địa chỉ", "vị trí"]
        }

        /** Xác định ý định chính của người dùng **/
        let userIntent = "general";
        for (const [intent, patterns] of Object.entries(intentPatterns)) {
            if (patterns.some(pattern => sanitizedMessage.toLowerCase().includes(pattern))) {
                userIntent = intent;
                break;
            }
        }

        /** Thêm bộ nhớ ngắn hạn để cải thiện ngữ cảnh **/
        let importantContext = "";
        if (chatHistory.body && chatHistory.body.length > 0) {
            /** Chỉ lấy 10 messages gần đây nhất để tránh các vấn đề về độ dài quá nhiếu **/
            const recentHistory = chatHistory.body.slice(-10);

            /** Thêm các tin nhắn gần đây vào context **/
            for (const msg of recentHistory) {
                parts.push({ text: `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}` });
            }

            /** Tìm thông tin sản phẩm từ lịch sử **/
            const lastProductMentions = chatHistory.body
                .filter(msg =>
                    msg.content.includes("sản phẩm") ||
                    msg.content.includes("áo") ||
                    msg.content.includes("quần") ||
                    msg.content.includes("mũ") ||
                    msg.content.includes("váy") ||
                    msg.content.includes("giày") ||
                    msg.content.includes("dép")
                )
                .slice(-2); /** Lấy 2 lần nhắc gần nhất **/

            if (lastProductMentions.length > 0) {
                importantContext = "Thông tin sản phẩm đã đề cập trước đó: \n";
                lastProductMentions.forEach(msg => {
                    const snippetLength = Math.min(msg.content.length, 100);
                    importantContext += `-${msg.content.substring(0, snippetLength)}${snippetLength < msg.content.length ? '...' : ''}\n`;
                });

                parts.push({ text: importantContext });
            }
        }

        /** Xử lý tìm kiếm sản phẩm với thông tin chi tiết hơn **/
        let productInfo = "";
        if (userIntent === "productSearch" || userIntent === "productInfo") {
            /** Cải thiện cách trích xuất từ khóa tìm kiếm **/
            let searchQuery = sanitizedMessage.toLowerCase();

            /** Loại bỏ các từ không cần thiết **/
            const stopWords = ["tìm", "kiếm", "có", "muốn", "xem", "mua", "cho", "thông", "tin", "đâu", "hiển", "thị", "bán", "giá", "sản phẩm", "sản", "phẩm"];
            stopWords.forEach(word => {
                searchQuery = searchQuery.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
            });

            /** Làm sạch khoảng trắng thừa **/
            searchQuery = searchQuery.replace(/\s+/g, ' ').trim();

            /** Phân tích yêu cầu để tìm màu sắc, kích cỡ, giá cả **/
            let colorMentions = [];
            let sizeMentions = [];
            let priceRange = null;

            /** Các keyword liên quan màu sắc **/
            const colorKeywords = ["màu", "color", "màu sắc"];
            const commonColors = ["đen", "trắng", "đỏ", "xanh", "vàng", "tím", "hồng", "xám", "nâu", "cam", "xanh dương", "xanh lá", "xanh ngọc"];

            /** Kiểm tra các từ khóa màu sắc **/
            colorKeywords.forEach(keyword => {
                if (searchQuery.includes(keyword)) {
                    // Tìm 10 ký tự sau từ khóa màu
                    const colorPart = searchQuery.substring(searchQuery.indexOf(keyword) + keyword.length).trim().split(' ')[0];
                    if (colorPart && colorPart.length > 1) {
                        colorMentions.push(colorPart);
                    }
                }
            })

            /** Kiểm tra các màu phổ biến **/
            commonColors.forEach(color => {
                if (searchQuery.includes(color) && !colorMentions.includes(color)) {
                    colorMentions.push(color);
                }
            });

            /** Tìm đề cập đến kích cỡ **/
            const sizeKeywords = ["size", "cỡ", "kích cỡ", "kích thước"];
            const commonSizes = ["S", "M", "L", "XL", "XXL"];

            /** Kiểm tra các từ khóa kích cỡ **/
            sizeKeywords.forEach(keyword => {
                if (searchQuery.includes(keyword)) {
                    // Tìm 5 ký tự sau từ khóa kích cỡ
                    const sizePart = searchQuery.substring(searchQuery.indexOf(keyword) + keyword.length).trim().split(' ')[0];
                    if (sizePart && sizePart.length >= 1) {
                        sizeMentions.push(sizePart.toUpperCase());
                    }
                }
            });

            /** Kiểm tra các kích cỡ phổ biến **/
            commonSizes.forEach(size => {
                if (searchQuery.includes(size.toLowerCase()) || searchQuery.includes(size)) {
                    if (!sizeMentions.includes(size)) {
                        sizeMentions.push(size);
                    }
                }
            });

            /** Tìm đề cập đến giá cả **/
            const priceKeywords = ["giá", "giá tiền", "giá cả", "đồng", "vnđ", "vnd", "tiền", "nghìn", "triệu", "k"];
            const pricePattern = /(\d+)\s*(k|nghìn|ngàn|triệu|tr|đồng|d|vnđ|vnd)/gi;

            const priceMatches = [...searchQuery.matchAll(pricePattern)];
            if (priceMatches.length > 0) {
                let minPrice = 0;
                let maxPrice = Number.MAX_SAFE_INTEGER;

                // Tìm giá cụ thể (ví dụ: 100k, 2 triệu)
                for (const match of priceMatches) {
                    let price = parseInt(match[1]);
                    const unit = match[2].toLowerCase();

                    // Chuyển đổi đơn vị tiền tệ
                    if (unit.includes('k') || unit.includes('nghìn') || unit.includes('ngàn')) {
                        price *= 1000;
                    } else if (unit.includes('tr') || unit.includes('triệu')) {
                        price *= 1000000;
                    }

                    // Xác định khoảng giá
                    if (searchQuery.includes('dưới') || searchQuery.includes('ít hơn') ||
                        searchQuery.includes('không quá') || searchQuery.includes('tối đa')) {
                        maxPrice = price;
                    } else if (searchQuery.includes('trên') || searchQuery.includes('hơn') ||
                        searchQuery.includes('tối thiểu') || searchQuery.includes('ít nhất')) {
                        minPrice = price;
                    } else {
                        // Mặc định là khoảng giá xung quanh giá trị này
                        minPrice = Math.max(0, price * 0.8);
                        maxPrice = price * 1.2;
                    }
                }

                priceRange = { min: minPrice, max: maxPrice };
            }


            if (searchQuery) {
                /** Tìm kiếm thêm với nhiều tiêu chí **/
                const productWhereClause = {
                    [Op.or]: [
                        { product_name: { [Op.like]: `%${searchQuery}%` } },
                        { description: { [Op.like]: `%${searchQuery}%` } }
                    ]
                };

                if (priceRange) {
                    productWhereClause.unit_price = {
                        [Op.between]: [priceRange.min, priceRange.max]
                    };
                }

                /** Chuẩn bị include các mối quan hệ **/
                const includeRelations = [
                    {
                        model: ProductImages,
                        as: 'product_images',
                        attributes: ['image_url']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'category_name']
                    }
                ];

                /** Thêm tiêu chí cho variants (màu sắc và kích cỡ) **/
                if (colorMentions.length > 0 || sizeMentions.length > 0) {
                    const variantWhere = {};

                    // Chuẩn bị include Color và Size (nếu cần)
                    const variantInclude = [];

                    if (colorMentions.length > 0) {
                        variantInclude.push({
                            model: Color,
                            as: 'color',
                            where: {
                                color_name: {
                                    [Op.or]: colorMentions.map(
                                        color => ({ [Op.like]: `%${color}%` })
                                    )
                                }
                            },
                            attributes: ['id', 'color_name', 'color_code']
                        });
                    }

                    if (sizeMentions.length > 0) {
                        variantInclude.push({
                            model: Size,
                            as: 'size',
                            where: {
                                size_code: {
                                    [Op.in]: sizeMentions
                                }
                            },
                            attributes: ['id', 'size_code']
                        })
                    }

                    includeRelations.push({
                        model: ProductVariant,
                        as: 'variants',
                        // where: variantWhere, thêm vào là lỗi, không cần thêm
                        include: variantInclude
                    })

                }

                /** Tìm kiếm sản phẩm với các tiêu chí đã xây dựng **/

                const products = await Product.findAll({
                    where: productWhereClause,
                    include: includeRelations,
                    limit: 5
                });

                if (products && products.length > 0) {
                    productInfo = "Thông tin sản phẩm từ cơ sở dữ liệu: \n";
                    for (let i = 0; i < Math.min(3, products.length); i++) {
                        const product = products[i];

                        /** Format giá tiền **/
                        const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                            .format(product.unit_price)
                            .replace(/\s/g, '');

                        productInfo += `${i + 1}. Sản phẩm #${product.id}: ${product.product_name}\n`;
                        productInfo += `   - Xuất xứ: ${product.origin || 'Không có thông tin xuất xứ'}\n`;
                        productInfo += `   - Giá: ${price}\n`;
                        productInfo += `   - Danh mục: ${product.category?.category_name || 'Không phân loại'}\n`;

                        /** Thêm thông tin về màu sắc và kích cỡ **/
                        if (product.variants && product.variants.length > 0) {
                            /** Tập hợp các màu và kích cỡ có sẵn **/
                            const availableColors = [];
                            const availableSizes = [];

                            product.variants.forEach(variant => {
                                if (variant.color && !availableColors.some(c => c.id === variant.color.id)) {
                                    availableColors.push({
                                        id: variant.color.id,
                                        name: variant.color.color_name,
                                        code: variant.color.color_code
                                    });
                                }

                                if (variant.size && !availableSizes.some(s => s.id === variant.size.id)) {
                                    availableSizes.push({
                                        id: variant.size.id,
                                        code: variant.size.size_code
                                    });
                                }
                            });

                            if (availableColors.length > 0) {
                                productInfo += `   - Màu sắc có sẵn: ${availableColors.map(c => c.name).join(', ')}\n`;
                            }

                            if (availableSizes.length > 0) {
                                productInfo += `   - Kích cỡ có sẵn: ${availableSizes.map(s => s.code).join(', ')}\n`;
                            }
                        }
                        /** Hiển thị link ảnh **/
                        if (product.product_images && product.product_images.length > 0) {
                            // Show up to 3 images per product
                            const maxImages = Math.min(3, product.product_images.length);
                            for (let i = 0; i < maxImages; i++) {
                                const cleanImageUrl = product.product_images[i].image_url.replace(/\\/g, '');
                                productInfo += `   [IMAGE:products/${cleanImageUrl}]\n`;
                            }
                        }

                        console.log('>>> aaaa if');
                        productInfo += `\n`;
                        // Add link to view product details with button text
                        productInfo += `   - [Xem chi tiết sản phẩm #${product.id}]\n\n`;
                    }

                    /** Thêm thông tin sản phẩm như một context ngữ cảnh **/
                    parts.push({ text: `Thông tin sản phẩm từ cơ sở dữ liệu: ${productInfo}` });
                } else {
                    /** Thử tìm kiếm với từng từ riêng lẻ **/
                    const searchTerms = searchQuery.split(' ');
                    const searchResults = [];

                    for (const term of searchTerms) {
                        if (term.length > 2) {
                            /** Chỉ tìm kiếm với các từ có độ dài > 2 **/
                            const termProducts = await Product.findAll({
                                where: {
                                    [Op.or]: [
                                        { product_name: { [Op.like]: `%${term}%` } },
                                        { description: { [Op.like]: `%${term}%` } }
                                    ]
                                },
                                include: [
                                    {
                                        model: ProductImages,
                                        as: 'product_images',
                                        attributes: ['image_url']
                                    },
                                    {
                                        model: Category,
                                        as: 'category',
                                        attributes: ['id', 'category_name']
                                    },
                                    {
                                        model: ProductVariant,
                                        as: 'variants',
                                        include: [
                                            {
                                                model: Color,
                                                as: 'color',
                                                attributes: ['id', 'color_name', 'color_code']
                                            },
                                            {
                                                model: Size,
                                                as: 'size',
                                                attributes: ['id', 'size_code']
                                            }
                                        ]
                                    }
                                ],
                                limit: 5
                            })

                            if (termProducts && termProducts.length > 0) {
                                searchResults.push(...termProducts);
                            }
                        }
                    }

                    /** Loại bỏ các sản phẩm trùng lặp **/
                    const uniqueProducts = Array.from(new Set(searchResults.map(p => p.id)))
                        .map(id => searchResults.find(p => p.id === id));

                    if (uniqueProducts.length > 0) {
                        productInfo = "Tôi tìm thấy một số sản phẩm liên quan:\n";
                        for (let i = 0; i < Math.min(3, uniqueProducts.length); i++) {
                            const product = uniqueProducts[i];
                            const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                                .format(product.unit_price)
                                .replace(/\s/g, '');

                            productInfo += `${i + 1}. Sản phẩm #${product.id}: ${product.product_name}\n`;
                            productInfo += `   - Xuất xứ: ${product.origin || 'Không có thông tin xuất xứ'}\n`;
                            productInfo += `   - Giá: ${price}\n`;
                            productInfo += `   - Danh mục: ${product.category?.category_name || 'Không phân loại'}\n`;

                            /** Thêm thông tin về màu sắc và kích cỡ **/
                            if (product.variants && product.variants.length > 0) {
                                /** Tập hợp các màu và kích cỡ có sẵn **/
                                const availableColors = [];
                                const availableSizes = [];

                                product.variants.forEach(variant => {
                                    if (variant.color && !availableColors.some(c => c.id === variant.color.id)) {
                                        availableColors.push({
                                            id: variant.color.id,
                                            name: variant.color.color_name,
                                            code: variant.color.color_code
                                        });
                                    }

                                    if (variant.size && !availableSizes.some(s => s.id === variant.size.id)) {
                                        availableSizes.push({
                                            id: variant.size.id,
                                            code: variant.size.size_code
                                        });
                                    }
                                });

                                if (availableColors.length > 0) {
                                    productInfo += `   - Màu sắc có sẵn: ${availableColors.map(c => c.name).join(', ')}\n`;
                                }

                                if (availableSizes.length > 0) {
                                    productInfo += `   - Kích cỡ có sẵn: ${availableSizes.map(s => s.code).join(', ')}\n`;
                                }
                            }

                            /** Hiển thị link ảnh **/
                            if (product.product_images && product.product_images.length > 0) {
                                // Show up to 3 images per product
                                const maxImages = Math.min(3, product.product_images.length);
                                for (let i = 0; i < maxImages; i++) {
                                    // Clean the image URL by removing escaped backslashes
                                    const cleanImageUrl = product.product_images[i].image_url.replace(/\\/g, '');
                                    productInfo += `   [IMAGE:products/${cleanImageUrl}]\n`;
                                }
                            }
                            console.log('> aaaa else')
                            // Add link to view product details with button text
                            productInfo += `\n`;
                            productInfo += `   - [Xem chi tiết sản phẩm #${product.id}]\n\n`;
                        }

                        parts.push({ text: `Thông tin sản phẩm từ cơ sở dữ liệu: ${productInfo}` });
                    } else {
                        // Xử lý khi không tìm thấy sản phẩm
                        parts.push({ text: `Không tìm thấy sản phẩm nào phù hợp với "${searchQuery}". Vui lòng thử từ khóa khác hoặc mô tả chi tiết hơn về sản phẩm bạn đang tìm kiếm.` });
                    }
                }
            }
        }

        /** Thêm truy vấn người dùng ở cuối **/
        parts.push({ text: `Người dùng: ${sanitizedMessage}\nTrợ lý:` });

        // Sinh context sử dụng Gemini với nhiệt độ thấp hơn
        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig: {
                temperature: 0.3,
                topP: 0.85,
                topK: 40,
                maxOutputTokens: 800,
            },
        });

        const assistantMessage = result.response.text();

        // Append product info if found but not mentioned in response
        const finalMessage = productInfo && !assistantMessage.toLowerCase().includes("sản phẩm") && !assistantMessage.includes("tìm thấy")
            ? `${assistantMessage}\n\n${productInfo}`
            : assistantMessage;

        // Save to database
        const newHistory = [...(chatHistory.body || [])];
        newHistory.push({ role: "user", content: sanitizedMessage });
        newHistory.push({ role: "assistant", content: finalMessage });

        await saveChatHistoryToDB(user_id, newHistory);

        return {
            status: 200,
            message: 'MESSAGE_SENT',
            body: {
                message: finalMessage,
                history: newHistory,
                linhtinh: {
                    message: message
                }
            }
        };
    } catch (error) {
        console.log(error);
        ResponseModel.error(error?.status, error?.message, error?.body);
    }
}



export const testGeminiConnection = async () => {
    try {
        // Check if GEMINI_API_KEY is set
        if (!GEMINI_API_KEY) {
            return {
                status: 500,
                message: 'GEMINI_API_KEY_MISSING',
                body: {
                    connected: false,
                    error: 'API key is not configured in .env file'
                }
            };
        }

        // Log API key first 5 chars for debugging
        console.log('API Key (first 5 chars):', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 5) + '...' : 'undefined');

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Try a simple generation
        const result = await model.generateContent("Xin chào");
        const response = result.response;
        const text = response.text();

        return {
            status: 200,
            message: 'GEMINI_CONNECTION_SUCCESS',
            body: {
                connected: true,
                response: text
            }
        };
    } catch (error) {
        console.error('Gemini connection test failed:', error);
        return {
            status: 500,
            message: 'GEMINI_CONNECTION_FAILED',
            body: {
                connected: false,
                error: error.message || 'Unknown error'
            }
        };
    }
};

export const listGeminiModels = async () => {
    try {
        return {
            status: 200,
            message: 'MODELS_FETCHED',
            body: [
                {
                    name: "gemini-1.5-pro",
                    supportedGenerationMethods: ["generateContent"],
                    description: "Mô hình Gemini 1.5 Pro - model mạnh nhất, hỗ trợ ngữ cảnh dài (pro context length)"
                },
                {
                    name: "gemini-1.5-flash",
                    supportedGenerationMethods: ["generateContent"],
                    description: "Mô hình Gemini 1.5 Flash - nhanh hơn nhưng ít mạnh hơn Pro"
                },
                {
                    name: "gemini-1.0-pro",
                    supportedGenerationMethods: ["generateContent"],
                    description: "Mô hình Gemini 1.0 Pro - phiên bản trước đó"
                }
            ]
        };
    } catch (error) {
        console.error('Error listing Gemini models:', error);
        return {
            status: HttpErrors.INTERNAL_SERVER_ERROR,
            message: 'MODELS_FETCH_ERROR',
            body: error.message || 'Unknown error'
        };
    }
};

export const getChatHistory = async (user_id) => {
    try {
        const history = await getChatHistoryFromDB(user_id);
        return {
            status: 200,
            message: 'CHAT_HISTORY_FETCHED',
            body: history.body || []
        }
    } catch (error) {
        console.error('Error in GetChatHistory: ', error);
        return {
            status: HttpErrors.INTERNAL_SERVER_ERROR,
            message: 'INTERNAL_SERVER_ERROR',
            body: error.message
        }
    }
}

export const saveChatHistory = async (user_id, messages) => {
    try {
        await saveChatHistoryToDB(user_id, messages);
        return {
            status: 200,
            message: 'CHAT_HISTORY_SAVED',
            body: {}
        }
    } catch (error) {
        console.error('Error in SaveChatHistory: ', error);
        return {
            status: HttpErrors.INTERNAL_SERVER_ERROR,
            message: 'INTERNAL_SERVER_ERROR',
            body: error.message
        }
    }
}

export const productSearch = async (
    querySearch,
    categoryId = null
) => {
    try {
        const products = await searchProducts(querySearch, categoryId);
        return {
            status: 200,
            message: 'PRODUCTS_FETCHED',
            body: products.body || []
        }
    } catch (error) {
        console.log('Error in product search: ', error);
        return {
            status: HttpErrors.INTERNAL_SERVER_ERROR,
            message: 'INTERNAL_SERVER_ERROR',
            body: error.message
        }
    }
}

/** Helper functions **/
const getChatHistoryFromDB = async (user_id) => {
    try {
        if (!ChatHistory) {
            console.log('Không tìm thấy model ChatHistory');
            return ResponseModel.success('Không tìm thấy model', []);
        }

        const history = await ChatHistory.findOne({
            where: {
                user_id: user_id
            }
        });

        if (!history) {
            console.log('Không tìm thấy lịch sử chat');
            return ResponseModel.success('Không tìm thấy lịch sử chat', []);
        }

        return ResponseModel.success('Lịch sử chat: ', JSON.parse(history.messages));
    } catch (error) {
        ResponseModel.error(HttpErrors.INTERNAL_SERVER_ERROR, 'Không lấy được lịch sử chat', error);
    }
}

const saveChatHistoryToDB = async (user_id, messages) => {
    try {
        if (!ChatHistory) {
            return true;
        }

        const [history, created] = await ChatHistory.findOrCreate({
            where: { user_id: user_id },
            defaults: {
                user_id: user_id,
                messages: JSON.stringify(messages)
            }
        })

        if (!created) {
            history.messages = JSON.stringify(messages);
            await history.save();
        }

        return true;
    } catch (error) {
        console.error('Error saving chat history: ', error);
        return false;
    }
}

const searchProducts = async (
    searchQuery,
    categoryId = null
) => {
    try {
        const whereClause = {
            product_name: {
                [Op.like]: `%${searchQuery}%`
            }
        }

        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        const products = await Product.findAll({
            where: whereClause,
            include: [
                {
                    model: ProductImages,
                    as: 'product_images',
                    attributes: ['image_url']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            limit: 5
        });

        return {
            status: 200,
            body: products
        }
    } catch (error) {
        console.error('Error searching products: ', error);
        return {
            status: HttpErrors.INTERNAL_SERVER_ERROR,
            body: []
        }
    }
}