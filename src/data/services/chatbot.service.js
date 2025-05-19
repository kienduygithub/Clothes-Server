import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../models';
import { Op } from 'sequelize';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Default model is gemini-1.5-pro
const PRIMARY_MODEL = "gemini-1.5-flash";
// Fallback models in case of quota issues - only use models available in v1beta
const FALLBACK_MODELS = ["gemini-1.5-flash"]; // Removing unavailable models

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are a helpful shopping assistant for an online clothing store. Your name is ClothesShop Assistant.

Follow these rules:
1. Start every conversation with a friendly greeting.
2. Only answer questions related to shopping and the products in our database.
3. If you don't have information about something, say you don't know.
4. Do not search for or mention external products or websites.
5. Keep responses concise and helpful.
6. When users ask about products, provide relevant details like name, price, sizes, colors, etc.
7. Respond naturally to social phrases (like "thank you", "good job", "ok", etc.) with friendly Vietnamese responses like "Không có gì ạ", "Cảm ơn bạn", "Rất vui khi được giúp đỡ bạn", etc.
8. Use conversational Vietnamese that matches how young people speak today, friendly but professional.
9. If someone is just chatting with you without asking about products, engage them in a friendly way and try to bring the conversation back to shopping topics.
`;

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

// Process a user message and generate a response
export const processMessage = async (userId, userMessage) => {
    try {
        // Get chat history or create new one
        let [chatHistory] = await db.ChatHistory.findOrCreate({
            where: { user_id: userId },
            defaults: {
                user_id: userId,
                messages: []
            }
        });

        // Add user message to history
        const messages = chatHistory.messages || [];
        messages.push({
            role: 'user',
            content: userMessage
        });

        // Search for products or shops based on the user message
        const searchResults = await searchProducts(userMessage);

        // Generate chatbot response with Gemini
        const botResponse = await generateBotResponse(messages, searchResults);

        // Add bot response to history with search results
        messages.push({
            role: 'assistant',
            content: botResponse,
            searchResults: searchResults
        });

        // Update chat history
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

// Get chat history for a user
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

// Search for products based on user message
const searchProducts = async (userMessage) => {
    try {
        const searchTerms = extractSearchTerms(userMessage);

        if (!searchTerms) {
            return [];
        }

        // Check if this is a shop search
        if (searchTerms.isShopSearch) {
            return await searchShops(searchTerms);
        }

        // If not a shop search, continue with product search
        // Create search query
        const query = {
            include: [
                {
                    model: db.Category,
                    as: 'category',
                    include: [{
                        model: db.Category,
                        as: 'children'
                    }]
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
                },
                {
                    model: db.ProductImages,
                    as: 'product_images'
                }
            ],
            where: {}
        };

        // Add name search
        if (searchTerms.name) {
            query.where.product_name = {
                [Op.like]: `%${searchTerms.name}%`
            };
        }

        // Add gender filter
        if (searchTerms.gender) {
            query.where.gender = searchTerms.gender;
        }

        // Add price range
        if (searchTerms.minPrice && searchTerms.maxPrice) {
            query.where.unit_price = {
                [Op.between]: [searchTerms.minPrice, searchTerms.maxPrice]
            };
        } else if (searchTerms.minPrice) {
            query.where.unit_price = {
                [Op.gte]: searchTerms.minPrice
            };
        } else if (searchTerms.maxPrice) {
            query.where.unit_price = {
                [Op.lte]: searchTerms.maxPrice
            };
        }

        // Perform the search
        const products = await db.Product.findAll(query);

        // Filter by size and color if needed
        let filteredProducts = products;

        if (searchTerms.size || searchTerms.color) {
            filteredProducts = products.filter(product => {
                const variants = product.variants || [];
                return variants.some(variant => {
                    const matchesSize = !searchTerms.size ||
                        (variant.size && variant.size.size_code.toLowerCase().includes(searchTerms.size.toLowerCase()));
                    const matchesColor = !searchTerms.color ||
                        (variant.color && variant.color.color_name.toLowerCase().includes(searchTerms.color.toLowerCase()));
                    return matchesSize && matchesColor;
                });
            });
        }

        // Format products for chatbot response
        return { type: 'products', data: formatProductsForResponse(filteredProducts) };
    } catch (error) {
        console.error('Product search error:', error);
        return { type: 'error', message: error.message };
    }
};

// Search for shops based on search terms
const searchShops = async (searchTerms) => {
    try {
        const query = {
            where: {}
        };

        // Search by shop name if provided
        if (searchTerms.shopName) {
            query.where.shop_name = {
                [Op.like]: `%${searchTerms.shopName}%`
            };
        }

        const shops = await db.Shop.findAll(query);

        // Format shop data for response
        return {
            type: 'shops',
            data: shops.map(shop => ({
                id: shop.id,
                name: shop.shop_name,
                email: shop.contact_email,
                address: shop.contact_address,
                logo_url: shop.logo_url
            }))
        };
    } catch (error) {
        console.error('Shop search error:', error);
        return { type: 'error', message: error.message };
    }
};

// Extract search terms from user message
const extractSearchTerms = (message) => {
    // Convert message to lowercase for easier matching
    const lowerMessage = message.toLowerCase();

    // Object to store search terms
    const searchTerms = {};

    // Check if user is searching for shop information
    const shopKeywords = ['cửa hàng', 'shop', 'store'];
    for (const keyword of shopKeywords) {
        if (lowerMessage.includes(keyword)) {
            searchTerms.isShopSearch = true;

            // Extract shop name if provided
            const shopNameRegex = new RegExp(`${keyword}\\s+([\\w\\s]+)`, 'i');
            const shopNameMatch = message.match(shopNameRegex);
            if (shopNameMatch && shopNameMatch[1]) {
                searchTerms.shopName = shopNameMatch[1].trim();
            }
            break;
        }
    }

    // If not searching for shop, assume product search
    if (!searchTerms.isShopSearch) {
        // Extract product name (basic approach - could be enhanced with NLP)
        const nameKeywords = ['áo', 'quần', 'váy', 'đầm', 'giày', 'dép', 'túi', 'ví', 'mũ', 'nón', 'kính', 'trang phục'];

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

        // Extract size
        const sizeRegex = /\b(size|kích\s*cỡ|kích\s*thước)\s*(xs|s|m|l|xl|xxl|\d+)\b/i;
        const sizeMatch = message.match(sizeRegex);
        if (sizeMatch && sizeMatch[2]) {
            searchTerms.size = sizeMatch[2];
        }

        // Extract color
        const colorKeywords = ['đen', 'trắng', 'đỏ', 'xanh', 'vàng', 'cam', 'tím', 'hồng', 'nâu', 'xám', 'bạc', 'vàng gold', 'xanh dương', 'xanh lá'];
        for (const color of colorKeywords) {
            if (lowerMessage.includes(color)) {
                searchTerms.color = color;
                break;
            }
        }

        // Extract gender
        if (lowerMessage.includes('nam')) searchTerms.gender = 'Male';
        else if (lowerMessage.includes('nữ')) searchTerms.gender = 'Female';
        else if (lowerMessage.includes('unisex')) searchTerms.gender = 'Unisex';
        else if (lowerMessage.includes('trẻ em') || lowerMessage.includes('kid')) searchTerms.gender = 'Kids';

        // Helper function to convert price strings to numerical values
        const convertPrice = (priceStr) => {
            priceStr = priceStr.trim().toLowerCase();
            let multiplier = 1;

            // Check for k, nghìn, ngàn (thousands)
            if (priceStr.endsWith('k') || priceStr.endsWith('nghìn') || priceStr.endsWith('ngàn')) {
                multiplier = 1000;
                priceStr = priceStr.replace(/k$|nghìn$|ngàn$/i, '').trim();
            }
            // Check for tr, triệu (millions)
            else if (priceStr.endsWith('tr') || priceStr.endsWith('triệu')) {
                multiplier = 1000000;
                priceStr = priceStr.replace(/tr$|triệu$/i, '').trim();
            }

            // Remove commas, dots in numbers
            priceStr = priceStr.replace(/\./g, '').replace(/,/g, '');

            // Parse the number
            const num = parseFloat(priceStr);
            if (!isNaN(num)) {
                return num * multiplier;
            }
            return null;
        };

        // Improved price extraction patterns
        // 1. Standard format: dưới/từ X đến Y
        const rangeRegex = /(dưới|under|less than|không quá)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)|(từ|from)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\s*(đến|to)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)|(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\s*(đến|to)\s*(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)/i;

        // 2. Direct price mentions: 100k, 100 nghìn, 1tr, 1.5 triệu, etc.
        const directPriceRegex = /\b(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\b/i;

        // First try range regex
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
        // If no range found, look for direct price mentions if accompanied by price-related words
        else if (lowerMessage.match(/(giá|price|cost|tiền|khoảng|tầm|khoảng chừng|tầm khoảng)/i)) {
            const priceMatches = [...lowerMessage.matchAll(/\b(\d+[k\s]*|[\d.,]+\s*(nghìn|ngàn|k|triệu|tr)?)\b/gi)];
            if (priceMatches.length === 1) {
                // Only one price mentioned - assume it's "around this price"
                const price = convertPrice(priceMatches[0][0]);
                if (price) {
                    // Create a reasonable range around this price
                    searchTerms.minPrice = Math.max(0, price * 0.8); // 20% below
                    searchTerms.maxPrice = price * 1.2; // 20% above
                }
            } else if (priceMatches.length >= 2) {
                // Multiple prices - assume it's a range
                const prices = priceMatches.map(match => convertPrice(match[0])).filter(p => p !== null);
                if (prices.length >= 2) {
                    prices.sort((a, b) => a - b);
                    searchTerms.minPrice = prices[0];
                    searchTerms.maxPrice = prices[prices.length - 1];
                }
            }
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
        // Extract available sizes and colors
        const sizes = new Set();
        const colors = new Set();

        if (product.variants) {
            product.variants.forEach(variant => {
                if (variant.size) sizes.add(variant.size.size_code);
                if (variant.color) colors.add(variant.color.color_name);
            });
        }

        // Format product data (without descriptions to keep responses shorter)
        // Use only the first image URL if available
        const image_url = product.product_images && product.product_images.length > 0 ?
            product.product_images[0].image_url : null;

        return {
            id: product.id,
            name: product.product_name,
            price: product.unit_price,
            gender: product.gender,
            category: product.category ? product.category.category_name : 'Unknown',
            sizes: Array.from(sizes),
            colors: Array.from(colors),
            image_url: image_url
        };
    });
};

// Generate bot response with Gemini with fallback and retry logic
const generateBotResponse = async (messages, searchResults) => {
    // Generate context for the chatbot
    let systemContext = SYSTEM_PROMPT;

    if (searchResults && searchResults.type === 'products' && searchResults.data.length > 0) {
        // Handle product results
        systemContext += "\n\nBelow are the products that match the user's search criteria:\n";
        searchResults.data.forEach((product, index) => {
            systemContext += `\nProduct ${index + 1}:\n`;
            systemContext += `- Tên: ${product.name}\n`;
            systemContext += `- Giá: ${product.price} VND\n`;

            if (product.gender) {
                systemContext += `- Giới tính: ${product.gender}\n`;
            }

            if (product.category) {
                systemContext += `- Danh mục: ${product.category}\n`;
            }

            if (product.sizes && product.sizes.length > 0) {
                systemContext += `- Kích cỡ có sẵn: ${product.sizes.join(', ')}\n`;
            }

            if (product.colors && product.colors.length > 0) {
                systemContext += `- Màu sắc có sẵn: ${product.colors.join(', ')}\n`;
            }

            if (product.image_url) {
                systemContext += `- Hình ảnh: ${product.image_url}\n`;
            }
        });
    } else if (searchResults && searchResults.type === 'shops' && searchResults.data.length > 0) {
        // Handle shop results
        systemContext += "\n\nBelow are the shops that match the user's search criteria:\n";
        searchResults.data.forEach((shop, index) => {
            systemContext += `\nShop ${index + 1}:\n`;
            systemContext += `- Tên: ${shop.name}\n`;
            if (shop.email) systemContext += `- Email: ${shop.email}\n`;
            if (shop.address) systemContext += `- Địa chỉ: ${shop.address}\n`;
            if (shop.logo_url) systemContext += `- Logo: ${shop.logo_url}\n`;
        });
    } else if (messages[messages.length - 1].content.toLowerCase().includes('tìm') ||
        messages[messages.length - 1].content.toLowerCase().includes('kiếm') ||
        messages[messages.length - 1].content.toLowerCase().includes('mua')) {
        systemContext += "\n\nKhông tìm thấy kết quả nào phù hợp với tiêu chí tìm kiếm của người dùng.";
    }

    // The prompt format consistent across all models
    const prompt = `
        ${systemContext}
        
        User message: ${messages[messages.length - 1].content}
        
        Please respond to the user's message based on the above instructions and context. Respond in Vietnamese.
    `;

    // Start with primary model, then try fallbacks
    const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];

    // Track errors to report if all models fail
    const errors = [];

    // Try each model in sequence until one works
    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Use simple generateContent to avoid complex conversation structure
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(`Error with model ${modelName}:`, error.message);
            errors.push(`${modelName}: ${error.message}`);

            // If it's not a quota error, or we're on the last model, don't continue
            if (!error.message.includes('quota') && !error.message.includes('429') && modelName === modelsToTry[modelsToTry.length - 1]) {
                throw error;
            }

            // Otherwise try the next model
            console.log(`Falling back to next model...`);
        }
    }

    // If we get here, all models failed
    console.error('All models failed:', errors.join('; '));
    return "Xin lỗi, hiện tại tôi đang gặp sự cố kết nối. Vui lòng thử lại sau. (Các mô hình AI đã thử: " + modelsToTry.join(', ') + ")";
};

// Process a message from guest user (no history storage)
export const processGuestMessage = async (userMessage, sessionId) => {
    try {
        // Create or get temporary chat history for this guest session
        if (!sessionId) {
            sessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }

        // Initialize guest session if it doesn't exist
        if (!guestSessions[sessionId]) {
            guestSessions[sessionId] = {
                messages: [
                    // Add initial greeting
                    {
                        role: 'assistant',
                        content: 'Xin chào! Tôi là ClothesShop Assistant. Tôi có thể giúp bạn tìm kiếm quần áo, phụ kiện và trả lời các câu hỏi về sản phẩm của chúng tôi.'
                    }
                ],
                lastAccessed: Date.now()
            };

            // Set timeout to clean up this session
            setTimeout(() => {
                delete guestSessions[sessionId];
            }, GUEST_SESSION_TIMEOUT);
        }

        // Update last accessed time
        guestSessions[sessionId].lastAccessed = Date.now();

        // Add user message to temporary session
        guestSessions[sessionId].messages.push({
            role: 'user',
            content: userMessage
        });

        // Search for products or shops based on the user message
        const searchResults = await searchProducts(userMessage);

        // Generate chatbot response with Gemini
        const botResponse = await generateBotResponse(guestSessions[sessionId].messages, searchResults);

        // Add bot response to temporary session with search results
        guestSessions[sessionId].messages.push({
            role: 'assistant',
            content: botResponse,
            searchResults: searchResults
        });

        // Return response and search results (but don't store anything permanently)
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

// Get temporary guest chat history
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

    // Update last accessed time
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

    // Thêm tin nhắn chào khi tạo session mới
    await db.ChatHistory.create({
        user_id: userId || null,
        session_id: session.session_id,
        messages: JSON.stringify([{
            role: 'assistant',
            content: 'Xin chào! Tôi là ClothesShop Assistant. Tôi có thể giúp bạn tìm kiếm quần áo, phụ kiện và trả lời các câu hỏi về sản phẩm của chúng tôi. Bạn muốn tìm kiếm sản phẩm gì hôm nay?'
        }])
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

    // Map lại để đảm bảo luôn có sessionId (dùng session_id)
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
    // Flatten messages
    let messages = [];
    histories.forEach(h => {
        try {
            const arr = Array.isArray(h.messages) ? h.messages : JSON.parse(h.messages);
            messages = messages.concat(arr);
        } catch (e) { }
    });

    // Nếu không có tin nhắn, thêm tin nhắn chào mặc định
    if (messages.length === 0) {
        messages = [{
            role: 'assistant',
            content: 'Xin chào! Tôi là ClothesShop Assistant. Tôi có thể giúp bạn tìm kiếm quần áo, phụ kiện và trả lời các câu hỏi về sản phẩm của chúng tôi. Bạn muốn tìm kiếm sản phẩm gì hôm nay?'
        }];
    }

    // Map lại format cho FE
    const mapped = (messages || []).map((msg, idx) => ({
        id: msg.id || `${msg.role}-${idx}-${Date.now()}`,
        text: msg.content,
        isUser: msg.role === 'user',
        searchResults: msg.searchResults || undefined
    }));
    return mapped;
};

export const sendMessageToSession = async (sessionId, userId, userMessage) => {
    // Lấy lịch sử chat hiện tại
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
    // Thêm tin nhắn user
    messages.push({ role: 'user', content: userMessage });

    // Gọi AI hoặc search thực tế
    const searchResults = await searchProducts(userMessage); // dùng lại hàm searchProducts nếu có
    const botResponse = await generateBotResponse(messages, searchResults); // dùng lại hàm generateBotResponse nếu có

    // Tin nhắn mới từ bot
    const botMessage = { role: 'assistant', content: botResponse, searchResults };
    messages.push(botMessage);

    // Lưu lại bản ghi mới
    await db.ChatHistory.create({
        user_id: userId || null,
        session_id: sessionId,
        messages: JSON.stringify([
            { role: 'user', content: userMessage },
            botMessage
        ])
    });

    // Chỉ trả về tin nhắn mới, không trả về toàn bộ lịch sử
    return {
        messages: [
            { role: 'user', content: userMessage },
            botMessage
        ]
    };
};
