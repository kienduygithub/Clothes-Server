import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAILER_NAME,
        pass: process.env.MAILER_PASS
    },
    tls: {
        rejectUnauthorized: true,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
});

export const verifyMailer = () => {
    transporter.verify((error, success) => {
        if (error) {
            console.log('>>> Kết nối mailer thất bại: ', error);
        } else {
            console.log('>>> Kết nối mailer thành công! Ready to send mail');
        }
    })
}

export const sendActivateStoreMailer = async (
    targetMailer,
    shopOwner,
    shopName,
) => {
    try {
        const template = await ejs.renderFile(
            path.join(__dirname, "../views/activate-store.mailer.ejs"),
            { shopOwner, shopName, shopUrl: process.env.NGROK_WEB }
        );

        await transporter.sendMail({
            from: `"Hỗ trợ" <${process.env.MAILER_NAME}>`,
            to: targetMailer,
            subject: "🎉 Cửa hàng của bạn đã được kích hoạt!",
            html: template
        });
        console.log("✅ Email kích hoạt đã gửi thành công!");
    } catch (error) {
        console.error("❌ Gửi email thất bại:", error);
    }
}

// return ResponseModel.success('Tạo tài khoản thành công', { user });
// sendActivateStoreMailer(
//     "buikienduy2020@gmail.com",
//     "Kiến Duy",
//     "Cửa hàng thời trang",
// );
