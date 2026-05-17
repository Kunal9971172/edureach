import app from "./app.ts";
import connectDB from "./config/database.config.ts";
import { initializeKnowledgeBase } from "./services/rag.service.ts";
import User from "./models/user.model.ts";
import { hashPassword } from "./utils/password.utils.ts";

const PORT = process.env.PORT || 8787;

const start = async (): Promise<void> => {
    try {
        // 1. Connect Mongoose (for users collection)
        await connectDB();

        // Seed admin user
        const adminEmail = "admin@edureach.com";
        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            console.log(" Seeding admin user...");
            const hashedAdminPassword = await hashPassword("edureachK");
            await User.create({
                name: "EduReach Admin",
                email: adminEmail,
                password: hashedAdminPassword,
                phone: "0000000000",
                role: "admin",
            });
            console.log(" Admin user created: admin@edureach.com / edureachK");
        } else {
            // Ensure password is updated if it already exists during development
            const hashedAdminPassword = await hashPassword("edureachK");
            await User.updateOne({ email: adminEmail }, { password: hashedAdminPassword });
            console.log(" Admin password verified/updated: admin@edureach.com / edureachK");
        }

        // 2. Index knowledge base if not already done
        //    First run: loads .txt → splits → embeds → stores in MongoDB
        //    Subsequent runs: sees data exists, skips
        await initializeKnowledgeBase();

        // 3. Start Express
        app.listen(PORT, () => {
            console.log(` EduReach Server is running!`);
            console.log(` URL: http://localhost:${PORT}`);
            console.log(` Node: ${process.version}`);
            console.log(` Press Ctrl+C to stop`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

start();