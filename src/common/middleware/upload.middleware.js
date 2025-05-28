import multer from "multer";
import path from "path";
import fs from "fs";
import HttpErrors from "../errors/http-errors";

const storageServer = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'infoImages') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/products"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'variantImages' || file.fieldname === 'variantUpdateImages') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/product_variants"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'adminOwnerFile') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/admin-owners"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'userFile') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/users"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'logoShopFile') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/shops"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'backgroundShopFile') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/shop-backgrounds"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'categoryFile') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/categories"
            );
            cb(null, uploadPath);
        } else if (file.fieldname === 'chatAttachments') {
            const uploadPath = path.resolve(
                __dirname,
                "../../assets/chat-attachments"
            );
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        } else {
            cb({
                status: HttpErrors.NOT_FOUND,
                message: 'Field không đúng',
                body: null
            });
        }
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }
});

export const uploadServer = multer({
    storage: storageServer,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!allowTypes.includes(file.mimetype)) {
            return cb({
                status: HttpErrors.BAD_REQUEST,
                message: 'Chỉ hỗ trợ định dạng JPEG, JPG và PNG!',
                body: null
            });
        }
        cb(null, true);
    }
})

export const handleDeleteImages = async (deletedImages) => {
    for (const image of deletedImages) {
        const imagePath = path.join(__dirname, "../../assets/", image);
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`Xóa file ${image}`);
            } else {
                console.log(`File không tồn tại: ${image}`);
            }
        } catch (error) {
            console.log(`Lỗi khi xóa file: ${image}`);
        }
    }
}

export const handleDeleteImageAsFailed = async (file) => {
    if (file) {
        const imagePath = path.join(
            __dirname, "../../assets/", file.filename
        )
        console.log(imagePath);
        try {
            fs.unlinkSync(file.path);
            console.log(`Xóa file ${file.filename}`);
        } catch (error) {
            console.log(`Lỗi khi xóa file: ${image}`);
        }
    }
}