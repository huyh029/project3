import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import notFoundHandler from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);


// Fallback middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
