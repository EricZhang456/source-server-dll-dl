import { Router } from "express";

const router = Router();

// redirect to /list
router.get("/", (_, res) => res.redirect("/list"));

export default router;
