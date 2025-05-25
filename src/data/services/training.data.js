export const TRAINING_DATA = [
    {
        query: "Tìm áo thun nam màu đen dưới 500k",
        extraction: {
            category_name: "áo thun",
            name: "áo thun",
            gender: "Male",
            color: "Đen",
            maxPrice: 500000
        }
    },
    {
        query: "Váy đầm dự tiệc màu đỏ size M",
        extraction: {
            category_name: "váy/đầm",
            name: "váy đầm dự tiệc",
            color: "Đỏ",
            size: "M"
        }
    },
    {
        query: "Tìm quần jean nam từ 200k đến 400k",
        extraction: {
            name: "quần jean",
            gender: "Male",
            minPrice: 200000,
            maxPrice: 400000
        }
    },
    {
        query: "Áo khoác nữ màu trắng size L chất lượng tốt",
        extraction: {
            name: "áo khoác",
            gender: "Female",
            color: "Trắng",
            size: "L",
            requiresGoodRating: true
        }
    },
    {
        query: "Tôi đang tìm sản phẩm dưới 500k, màu đen",
        extraction: {
            maxPrice: 500000,
            color: "Đen"
        }
    },
    {
        query: "Các sản phẩm đánh giá tốt nhất",
        extraction: {
            requiresGoodRating: true
        }
    },
    {
        query: "Áo thun unisex",
        extraction: {
            category_name: "áo thun",
            name: "áo thun",
            gender: "Unisex"
        }
    },
    {
        query: "Quần áo trẻ em",
        extraction: {
            category_name: "quần áo trẻ em",
            gender: "Kids"
        }
    },
    {
        query: "Shop uy tín bán áo khoác",
        extraction: {
            name: "áo khoác",
            requiresGoodRating: true
        }
    },
    {
        query: "Tìm áo sơ mi nam từ 1 triệu",
        extraction: {
            name: "áo sơ mi",
            gender: "Male",
            minPrice: 1000000
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
    'đó', 'đó nhé', 'thế', 'vậy', 'thế nhá', 'vậy nha',

    // Từ chỉ định/yêu cầu
    'cho', 'tìm', 'kiếm', 'muốn', 'cần', 'được', 'với', 'và', 'hay', 'hoặc',
    'giúp', 'xem', 'có', 'không', 'đang', 'sẽ', 'là', 'của', 'ra',
    'tôi', 'mình', 'bạn', 'anh', 'chị', 'em', 'cho tôi', 'giúp tôi', 'tìm cho tôi',
    'giúp mình', 'cho mình', 'tìm cho mình', 'xem cho', 'tìm giúp',

    // Từ khẩn cấp/quan trọng
    'gấp gấp', 'khẩn', 'ngay', 'liền', 'ngay lập tức', 'ngay bây giờ',
    'ngay và luôn', 'càng sớm càng tốt', 'sớm', 'nhanh nhất có thể',

    // Từ tiếng Anh thường gặp
    'please', 'pls', 'plz', 'now', 'asap', 'urgent', 'help', 'find', 'search',
    'show', 'give', 'need', 'want', 'looking', 'looking for'
];