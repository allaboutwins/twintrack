import { Router, type IRouter } from "express";
import healthRouter from "./health";
import twinsRouter from "./twins";
import sleepRouter from "./sleep";
import feedingRouter from "./feeding";
import diapersRouter from "./diapers";
import routinesRouter from "./routines";
import videosRouter from "./videos";
import milestonesRouter from "./milestones";
import dashboardRouter from "./dashboard";
import onboardingRouter from "./onboarding";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(twinsRouter);
router.use(sleepRouter);
router.use(feedingRouter);
router.use(diapersRouter);
router.use(routinesRouter);
router.use(videosRouter);
router.use(milestonesRouter);
router.use(dashboardRouter);
router.use(onboardingRouter);
router.use(feedbackRouter);

export default router;
