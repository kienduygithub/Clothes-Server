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