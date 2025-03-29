// Danh sách sản phẩm có cả review (Không cần lắm)
const products = await db.Product.findAll({
    attributes: {
        include: [
            [sequelize.fn('AVG', sequelize.col('reviews.rating')), 'rating']
        ]
    },
    include: [
        {
            model: db.ProductImages,
            as: 'product_images',
            attributes: ['id', 'image_url']
        },
        {
            model: db.Category,
            as: 'category',
            attributes: ['id', 'category_name'],
            include: {
                model: db.Category,
                as: 'parent',
                attributes: ['id', 'category_name']
            }
        },
        {
            model: db.Review,
            as: 'reviews',
            attributes: ['id', 'rating', 'comment']
        },
    ],
    group: ['Product.id', 'reviews.id'], // Bổ sung group theo review.id
    subQuery: false, // Ngăn việc sinh subquery gây mất dữ liệu
    transaction: t
});