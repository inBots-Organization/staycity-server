import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { PERMISSIONS } from '../types/permissions';
import * as sittingsController from "../controllers/sittingsContrller"


const router = Router();


// router.route("/create").post(sittingsController.create)
router.route("/update").put(sittingsController.updateSittings)
router.route("/").get(sittingsController.getSittings)




export default router






