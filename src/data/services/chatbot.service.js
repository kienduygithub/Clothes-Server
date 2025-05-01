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

            if (searchQuery) {
                /** Tìm kiếm thêm với nhiều điều kiện **/
                const products = await Product.findAll({
                    where: {
                        [Op.or]: [
                            { product_name: { [Op.like]: `%${searchQuery}%` } },
                            { description: { [Op.like]: `${searchQuery}` } }
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
                        }
                    ],
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

                        productInfo += `${i + 1}. ${product.product_name}\n`;
                        productInfo += `   - Mô tả: ${product.description || 'Không có mô tả'}\n`;
                        productInfo += `   - Xuất xứ: ${product.origin || 'Không có thông tin xuất xứ'}\n`;
                        productInfo += `   - Giá: ${price}\n`;
                        productInfo += `   - Danh mục: ${product.category?.category_name || 'Không phân loại'}\n`;

                        /** Hiển thị link ảnh **/
                        if (product.product_images && product.product_images.length > 0) {
                            productInfo += `   - Hình ảnh:\n`;
                            product.product_images.forEach((image, index) => {
                                productInfo += `     ${index + 1}. ${image.image_url}\n`;
                            });
                        }
                        productInfo += `\n`;
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

                            productInfo += `${i + 1}. ${product.product_name}\n`;
                            productInfo += `   - Mô tả: ${product.description || 'Không có mô tả'}\n`;
                            productInfo += `   - Xuất xứ: ${product.origin || 'Không có thông tin xuất xứ'}\n`;
                            productInfo += `   - Giá: ${price}\n`;
                            productInfo += `   - Danh mục: ${product.category?.category_name || 'Không phân loại'}\n`;

                            // Hiển thị link ảnh
                            if (product.product_images && product.product_images.length > 0) {
                                productInfo += `   - Hình ảnh:\n`;
                                product.product_images.forEach((image, index) => {
                                    productInfo += `     ${index + 1}. ${image.image_url}\n`;
                                });
                            }
                            productInfo += `\n`;
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
        const finalMessage = productInfo && !assistantMessage.includes("sản phẩm") && !assistantMessage.includes("tìm thấy")
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
                history: newHistory
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