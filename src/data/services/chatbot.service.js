import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../models';
import { Op } from 'sequelize';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Default model is gemini-1.5-pro
const PRIMARY_MODEL = "gemini-1.5-pro";
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

        // Extract price range
        const priceRegex = /(dưới|under|less than|không quá)\s*(\d+)|(từ|from)\s*(\d+)\s*(đến|to)\s*(\d+)|(\d+)\s*(đến|to)\s*(\d+)|(\d+)\s*k|\s*(\d+)\s*vnd|\s*(\d+)\s*đồng/i;
        const priceMatch = message.match(priceRegex);

        if (priceMatch) {
            if (priceMatch[1] && priceMatch[2]) {  // "dưới X"
                searchTerms.maxPrice = parseInt(priceMatch[2]);
            } else if (priceMatch[3] && priceMatch[4] && priceMatch[6]) {  // "từ X đến Y"
                searchTerms.minPrice = parseInt(priceMatch[4]);
                searchTerms.maxPrice = parseInt(priceMatch[6]);
            } else if (priceMatch[7] && priceMatch[9]) {  // "X đến Y"
                searchTerms.minPrice = parseInt(priceMatch[7]);
                searchTerms.maxPrice = parseInt(priceMatch[9]);
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
