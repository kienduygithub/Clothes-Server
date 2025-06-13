export const TRAINING_DATA = [
    {
        query: "Tìm áo thun nam màu đen dưới 500k",
        extraction: {
            category_name: "áo thun",
            name: "áo thun",
            gender: "Male",
            color: "Đen",
            maxPrice: 500000,
            isShopSearch: false
        }
    },
    {
        query: "Váy đầm dự tiệc màu đỏ size M",
        extraction: {
            category_name: "váy/đầm",
            name: "váy đầm dự tiệc",
            color: "Đỏ",
            size: "M",
            isShopSearch: false
        }
    },
    {
        query: "Tìm quần jean nam từ 200k đến 400k",
        extraction: {
            name: "quần jean",
            gender: "Male",
            minPrice: 200000,
            maxPrice: 400000,
            isShopSearch: false
        }
    },
    {
        query: "Áo khoác nữ màu trắng size L chất lượng tốt",
        extraction: {
            name: "áo khoác",
            gender: "Female",
            color: "Trắng",
            size: "L",
            requiresGoodRating: true,
            isShopSearch: false
        }
    },
    {
        query: "Tôi đang tìm sản phẩm dưới 500k, màu đen",
        extraction: {
            maxPrice: 500000,
            color: "Đen",
            isShopSearch: false
        }
    },
    {
        query: "Các sản phẩm đánh giá tốt nhất",
        extraction: {
            requiresGoodRating: true,
            isShopSearch: false
        }
    },
    {
        query: "Áo thun unisex",
        extraction: {
            category_name: "áo thun",
            name: "áo thun",
            gender: "Unisex",
            isShopSearch: false
        }
    },
    {
        query: "Quần áo trẻ em",
        extraction: {
            category_name: "quần áo trẻ em",
            gender: "Kids",
            isShopSearch: false
        }
    },
    {
        query: "Shop uy tín bán áo khoác",
        extraction: {
            name: "áo khoác",
            requiresGoodRating: true,
            isShopSearch: true,
            shopKeywords: "uy tín"
        }
    },
    {
        query: "Tìm áo sơ mi nam từ 1 triệu",
        extraction: {
            name: "áo sơ mi",
            gender: "Male",
            minPrice: 1000000,
            isShopSearch: false
        }
    },
    // Thêm các mẫu tìm kiếm shop
    {
        query: "Shop uy tín bán áo khoác",
        extraction: {
            name: "áo khoác",
            requiresGoodRating: true,
            isShopSearch: true,
            shopKeywords: "uy tín"
        }
    },
    {
        query: "Tìm áo sơ mi nam từ 1 triệu",
        extraction: {
            name: "áo sơ mi",
            gender: "Male",
            minPrice: 1000000,
            isShopSearch: false
        }
    },
    {
        query: "Tìm shop bán quần áo nam",
        extraction: {
            gender: "Male",
            isShopSearch: true,
            shopKeywords: "quần áo nam"
        }
    },
    {
        query: "Shop nào bán đồ thể thao",
        extraction: {
            category_name: "đồ thể thao",
            isShopSearch: true,
            shopKeywords: "đồ thể thao"
        }
    },
    {
        query: "Cửa hàng có đánh giá tốt",
        extraction: {
            isShopSearch: true,
            requiresGoodRating: true
        }
    },
    {
        query: "Shop bán váy đầm dự tiệc",
        extraction: {
            category_name: "váy/đầm",
            name: "váy đầm dự tiệc",
            isShopSearch: true,
            shopKeywords: "váy đầm dự tiệc"
        }
    },
    {
        query: "Tìm shop có nhiều review tốt",
        extraction: {
            isShopSearch: true,
            requiresGoodRating: true
        }
    },
    {
        query: "Em muốn tìm áo phông nam size L màu xanh navy giá dưới 300k ạ",
        extraction: {
            category_name: "áo thun",
            name: "áo phông",
            gender: "Male",
            size: "L",
            color: "Xanh navy",
            maxPrice: 300000,
            isShopSearch: false
        }
    },
    {
        query: "Cho em xem váy maxi đi biển mùa hè nữ từ 500-800k",
        extraction: {
            category_name: "váy/đầm",
            name: "váy maxi đi biển",
            gender: "Female",
            minPrice: 500000,
            maxPrice: 800000,
            isShopSearch: false
        }
    },
    {
        query: "Tìm giúp em set đồ nam công sở chất lượng tốt",
        extraction: {
            category_name: "đồ công sở",
            gender: "Male",
            requiresGoodRating: true,
            isShopSearch: false
        }
    },
    {
        query: "Có shop nào bán đồ thể thao nam nữ giá rẻ không ạ?",
        extraction: {
            category_name: "đồ thể thao",
            gender: "Unisex",
            isShopSearch: true,
            shopKeywords: "đồ thể thao giá rẻ"
        }
    },
    {
        query: "Em đang tìm áo len oversize nữ màu be",
        extraction: {
            category_name: "áo len",
            name: "áo len oversize",
            gender: "Female",
            color: "Be",
            isShopSearch: false
        }
    },
    {
        query: "Shop nào có quần baggy jean nữ đẹp nhỉ",
        extraction: {
            name: "quần baggy jean",
            gender: "Female",
            isShopSearch: true,
            shopKeywords: "quần baggy jean nữ"
        }
    },
    {
        query: "Tìm đồ bộ mặc nhà cho bé gái 5 tuổi",
        extraction: {
            category_name: "đồ bộ",
            name: "đồ bộ mặc nhà",
            gender: "Kids",
            isShopSearch: false
        }
    },
    {
        query: "Cần tìm áo blazer nam đen size XL chất vải tốt",
        extraction: {
            category_name: "áo blazer",
            name: "áo blazer",
            gender: "Male",
            color: "Đen",
            size: "XL",
            requiresGoodRating: true,
            isShopSearch: false
        }
    },
    {
        query: "Shop bán áo croptop nữ dưới 200k review tốt",
        extraction: {
            name: "áo croptop",
            gender: "Female",
            maxPrice: 200000,
            requiresGoodRating: true,
            isShopSearch: true,
            shopKeywords: "áo croptop nữ"
        }
    },
    {
        query: "Tìm shop chuyên bán đồ thể thao nam chính hãng",
        extraction: {
            category_name: "đồ thể thao",
            gender: "Male",
            isShopSearch: true,
            requiresGoodRating: true,
            shopKeywords: "đồ thể thao nam chính hãng"
        }
    },
    {
        query: "Tìm áo đẹp",
        extraction: {
            category_name: "áo",
            requiresGoodRating: true,
            keywords: "áo"
        }
    },
    {
        query: "Tìm áo đẹp giá hời",
        extraction: {
            category_name: "áo",
            requiresGoodRating: true,
            name: 'áo',
            minPrice: null,
            maxPrice: 200000,
            keywords: "áo"
        }
    },
    {
        query: "Tìm áo thun đẹp giá dưới 200k chất lượng tốt",
        extraction: {
            category_name: "áo thun",
            requiresGoodRating: true,
            minPrice: null,
            maxPrice: 200000,
            keywords: "áo thun"
        }
    },
    {
        query: "Tìm áo thun nam đẹp giá dưới 200k chất lượng tốt",
        extraction: {
            category_name: "áo thun",
            requiresGoodRating: true,
            gender: "Male",
            minPrice: null,
            maxPrice: 200000,
            keywords: "áo thun nam"
        }
    },
    {
        query: "Tìm áo sơ mi nữ giá từ 250k đến 450k chất lượng cao",
        extraction: {
            category_name: "áo sơ mi",
            requiresGoodRating: true,
            gender: "Female",
            minPrice: 250000,
            maxPrice: 450000,
            keywords: "áo sơ mi nữ"
        }
    },
    {
        query: "Tìm áo khoác unisex giá rẻ dưới 300k",
        extraction: {
            category_name: "áo khoác",
            requiresGoodRating: false,
            gender: "Unisex",
            minPrice: null,
            maxPrice: 300000,
            keywords: "áo khoác unisex"
        }
    },
    {
        query: "Tìm áo len trẻ em chất lượng tốt giá từ 150k",
        extraction: {
            category_name: "áo len",
            requiresGoodRating: true,
            gender: "Kids",
            minPrice: 150000,
            maxPrice: null,
            keywords: "áo len trẻ em"
        }
    },
    {
        query: "Tìm áo hoodie không phân biệt giới tính giá dưới 400k chất lượng ổn",
        extraction: {
            category_name: "áo hoodie",
            requiresGoodRating: true,
            gender: "Other",
            minPrice: null,
            maxPrice: 400000,
            keywords: "áo hoodie"
        }
    },
    {
        query: "Tìm áo phông nam giá rẻ dưới 120k",
        extraction: {
            category_name: "áo phông",
            requiresGoodRating: false,
            gender: "Male",
            minPrice: null,
            maxPrice: 120000,
            keywords: "áo phông nam"
        }
    },
    {
        query: "Tìm áo polo nữ cao cấp giá từ 300k đến 600k",
        extraction: {
            category_name: "áo polo",
            requiresGoodRating: true,
            gender: "Female",
            minPrice: 300000,
            maxPrice: 600000,
            keywords: "áo polo nữ"
        }
    },
    {
        query: "Tìm áo croptop unisex giá dưới 200k chất lượng tốt",
        extraction: {
            category_name: "áo croptop",
            requiresGoodRating: true,
            gender: "Unisex",
            minPrice: null,
            maxPrice: 200000,
            keywords: "áo croptop unisex"
        }
    },
    {
        query: "Tìm áo khoác gió trẻ em giá từ 100k đến 250k chất lượng cao",
        extraction: {
            category_name: "áo khoác gió",
            requiresGoodRating: true,
            gender: "Kids",
            minPrice: 100000,
            maxPrice: 250000,
            keywords: "áo khoác gió trẻ em"
        }
    },
    {
        query: "Tìm áo thun in hình không phân biệt giới tính giá rẻ dưới 150k",
        extraction: {
            category_name: "áo thun",
            requiresGoodRating: false,
            gender: "Other",
            minPrice: null,
            maxPrice: 150000,
            keywords: "áo thun in hình"
        }
    },
    {
        query: "Tìm áo thun nam giá hời dưới 150k mà chất xịn",
        extraction: {
            category_name: "áo thun",
            requiresGoodRating: true,
            gender: "Male",
            minPrice: null,
            maxPrice: 150000,
            keywords: "áo thun nam"
        }
    },
    {
        query: "Tìm áo sơ mi nữ giá rẻ bèo mà đẹp từ 100k đến 250k",
        extraction: {
            category_name: "áo sơ mi",
            requiresGoodRating: true,
            gender: "Female",
            minPrice: 100000,
            maxPrice: 250000,
            keywords: "áo sơ mi nữ"
        }
    },
    {
        query: "Tìm áo khoác unisex giá siêu hời dưới 200k",
        extraction: {
            category_name: "áo khoác",
            requiresGoodRating: false,
            gender: "Unisex",
            minPrice: null,
            maxPrice: 200000,
            keywords: "áo khoác unisex"
        }
    },
    {
        query: "Tìm áo len trẻ em giá mềm mà chất lượng tốt",
        extraction: {
            category_name: "áo len",
            requiresGoodRating: true,
            gender: "Kids",
            minPrice: null,
            maxPrice: null,
            keywords: "áo len trẻ em"
        }
    },
    {
        query: "Tìm áo hoodie không phân biệt giới tính giá rẻ dã man dưới 300k",
        extraction: {
            category_name: "áo hoodie",
            requiresGoodRating: false,
            gender: "Other",
            minPrice: null,
            maxPrice: 300000,
            keywords: "áo hoodie"
        }
    },
    {
        query: "Tìm áo phông nam giá hạt dẻ dưới 100k",
        extraction: {
            category_name: "áo phông",
            requiresGoodRating: false,
            gender: "Male",
            minPrice: null,
            maxPrice: 100000,
            keywords: "áo phông nam"
        }
    },
    {
        query: "Tìm áo polo nữ giá hời mà xịn từ 200k đến 400k",
        extraction: {
            category_name: "áo polo",
            requiresGoodRating: true,
            gender: "Female",
            minPrice: 200000,
            maxPrice: 400000,
            keywords: "áo polo nữ"
        }
    },
    {
        query: "Tìm áo croptop unisex giá rẻ xịn dưới 180k",
        extraction: {
            category_name: "áo croptop",
            requiresGoodRating: true,
            gender: "Unisex",
            minPrice: null,
            maxPrice: 180000,
            keywords: "áo croptop unisex"
        }
    },
    {
        query: "Tìm áo khoác gió trẻ em giá rẻ chất lượng từ 120k đến 250k",
        extraction: {
            category_name: "áo khoác gió",
            requiresGoodRating: true,
            gender: "Kids",
            minPrice: 120000,
            maxPrice: 250000,
            keywords: "áo khoác gió trẻ em"
        }
    },
    {
        query: "Tìm áo thun in hình giá siêu rẻ dưới 130k",
        extraction: {
            category_name: "áo thun",
            requiresGoodRating: false,
            gender: "Other",
            minPrice: null,
            maxPrice: 130000,
            keywords: "áo thun in hình"
        }
    },
    {
        query: "Tìm áo thun giá hời dưới 100k",
        extraction: {
            category_name: "áo thun",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 100000,
            keywords: "áo thun"
        }
    },
    {
        query: "Tìm áo sơ mi giá rẻ bèo dưới 200k",
        extraction: {
            category_name: "áo sơ mi",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: "áo sơ mi"
        }
    },
    {
        query: "Tìm áo khoác giá siêu hời từ 150k đến 300k",
        extraction: {
            category_name: "áo khoác",
            requiresGoodRating: false,
            minPrice: 150000,
            maxPrice: 300000,
            keywords: "áo khoác"
        }
    },
    {
        query: "Tìm áo len giá mềm dưới 250k",
        extraction: {
            category_name: "áo len",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 250000,
            keywords: "áo len"
        }
    },
    {
        query: "Tìm áo hoodie giá rẻ dã man dưới 350k",
        extraction: {
            category_name: "áo hoodie",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 350000,
            keywords: "áo hoodie"
        }
    },
    {
        query: "Tìm áo polo giá rẻ xịn dưới 180k",
        extraction: {
            category_name: "áo polo",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 180000,
            keywords: "áo polo"
        }
    },
    {
        query: "Tìm áo croptop giá hạt dẻ dưới 120k",
        extraction: {
            category_name: "áo croptop",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 120000,
            keywords: "áo croptop"
        }
    },
    {
        query: "Sản phẩm giá rẻ, siêu hời",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá rẻ",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 150000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá tốt",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá mềm",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá rẻ",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 150000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá tốt",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá mềm",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá hời",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 180000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá rẻ bèo",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 150000,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá siêu tốt",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá siêu hời",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 170000,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá rẻ xịn",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 190000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá hạt dẻ",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 160000,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá rẻ hết sảy",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá rẻ",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 150000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá tốt",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá mềm",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 200000,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá rẻ chẳng hạn",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 180000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá rẻ bèo",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 150000,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá siêu hời",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: null,
            maxPrice: 170000,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá cao xịn",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: 500000,
            maxPrice: null,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá đắt nhưng chất",
        extraction: {
            category_name: "",
            requiresGoodRating: true,
            minPrice: 200000,
            maxPrice: null,
            keywords: ""
        }
    },
    {
        query: "Sản phẩm giá mắc xịn",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: 700000,
            maxPrice: null,
            keywords: ""
        }
    },
    {
        query: "Các sản phẩm giá cao cấp",
        extraction: {
            category_name: "",
            requiresGoodRating: false,
            minPrice: 800000,
            maxPrice: null,
            keywords: ""
        }
    }
];

export const VIETNAMESE_STOPWORDS = [
    // Từ thúc giục
    'đê', 'đi', 'mau', 'nào', 'lẹ', 'nhanh', 'hurry', 'quick', 'fast',
    'lẹ nào', 'nhanh lên', 'mau lên', 'nhanh nào', 'lẹ lên', 'mau mau',
    'nhanh chóng', 'gấp', 'gấp đi', 'nhanh tay', 'tranh thủ', 'vội',
    'nhanh nhé', 'nhanh chứ', 'lẹ đi', 'mau đi', 'nhanh đi', 'gấp nào',

    // Từ cảm thán/kết thúc câu
    'nhé', 'ạ', 'nhá', 'thôi', 'đấy', 'này', 'đây', 'kìa', 'kia',
    'nhỉ', 'nhở', 'đi nào', 'thế nhé', 'vậy nhé', 'nha', 'hen',
    'đó', 'đó nhé', 'thế', 'vậy', 'thế nhá', 'vậy nha', 'nhở',
    'nhỉ', 'ấy', 'ý', 'à', 'ừ', 'ừm', 'uh', 'uk', 'okay', 'ok',
    'okie', 'oke', 'yeah', 'yep', 'yes', 'đúng rồi', 'phải', 'đúng vậy',

    // Từ chỉ định/yêu cầu
    'cho', 'tìm', 'kiếm', 'muốn', 'cần', 'được', 'với', 'và', 'hay', 'hoặc',
    'giúp', 'xem', 'có', 'không', 'đang', 'sẽ', 'là', 'của', 'ra',
    'tôi', 'mình', 'bạn', 'anh', 'chị', 'em', 'cho tôi', 'giúp tôi', 'tìm cho tôi',
    'giúp mình', 'cho mình', 'tìm cho mình', 'xem cho', 'tìm giúp',
    'coi', 'coi thử', 'thử', 'check', 'kiểm tra', 'review', 'đánh giá',
    'tư vấn', 'gợi ý', 'suggest', 'recommendation', 'recommend',

    // Từ khẩn cấp/quan trọng
    'gấp gấp', 'khẩn', 'ngay', 'liền', 'ngay lập tức', 'ngay bây giờ',
    'ngay và luôn', 'càng sớm càng tốt', 'sớm', 'nhanh nhất có thể',
    'urgent', 'asap', 'priority', 'important', 'emergency',

    // Từ tiếng Anh thường gặp
    'please', 'pls', 'plz', 'now', 'asap', 'urgent', 'help', 'find', 'search',
    'show', 'give', 'need', 'want', 'looking', 'looking for', 'check',
    'review', 'rate', 'rating', 'good', 'best', 'nice', 'cool', 'awesome',
    'amazing', 'great', 'excellent', 'perfect', 'better', 'cheap', 'expensive',

    // Từ chỉ thời gian
    'hôm nay', 'bây giờ', 'lúc này', 'hiện tại', 'nowadays', 'now',
    'today', 'currently', 'present', 'moment', 'time', 'asap',

    // Từ chỉ số lượng/mức độ
    'nhiều', 'ít', 'vừa', 'đủ', 'quá', 'rất', 'khá', 'tạm', 'tầm',
    'khoảng', 'độ', 'cỡ', 'chừng', 'many', 'much', 'few', 'little',
    'enough', 'more', 'less', 'about', 'around', 'approximately',

    // Từ liên kết
    'nhưng', 'và', 'hoặc', 'hay', 'thì', 'là', 'mà', 'nên', 'bởi vì',
    'vì', 'do', 'bởi', 'tại', 'nếu', 'nếu như', 'nếu mà', 'vậy thì',
    'thế thì', 'vì thế', 'vì vậy', 'cho nên', 'bởi thế', 'tuy nhiên',
    'mặc dù', 'dù', 'dù là', 'tuy', 'tuy là', 'nhưng mà', 'thế nhưng',
    'song', 'song le', 'thế mà', 'vậy mà', 'thế mới', 'vậy mới'
];