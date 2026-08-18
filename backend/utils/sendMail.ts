import nodemailer from "nodemailer";

export async function sendMail(
    reciverEmail: string,
    subject: string,
    body: string
) {
    // Create transporter
    const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
            user: "abc@mail.com", // Organization email
            pass: "your_app_password",
        },
        tls: {
            ciphers: "SSLv3",
        },
    });

    // Mail options
    const mailOptions = {
        from: `"Asset Management Notification" <abc@mail.com>`,
        to: reciverEmail,
        subject: subject,
        html: body,
    };

    // Send mail
    return await transporter.sendMail(mailOptions);
}
