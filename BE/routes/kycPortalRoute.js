const express = require("express");
const singleUpload = require("../middlewares/multer");
const { isAuthorizedUser } = require("../middlewares/auth");
const portal = require("../controllers/kycPortalController");

const router = express.Router();

router.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

// Public client onboarding agreement submission (Get Started page)
router.post("/submit-agreement", singleUpload, portal.submitAgreement);

router.use((req, res, next) => isAuthorizedUser(req, res, next));

router.get("/me", portal.getMe);
router.post("/auth/register", portal.createPortalAccount);

router.post("/kyc/submit", singleUpload, portal.submitKyc);
router.get("/kyc/:userId/:docType", portal.getKycDocument);
router.patch("/kyc/:userId", portal.reviewKyc);
router.delete("/kyc/:userId", portal.deleteKyc);

router.get("/documents", portal.listDocuments);
router.post("/documents", singleUpload, portal.createDocument);
router.delete("/documents", portal.bulkDeleteDocuments);
router.get("/documents/:id/download", portal.downloadDocument);
router.post("/documents/:id/sign", portal.signDocument);
router.get("/documents/:id", portal.getDocument);
router.patch("/documents/:id", portal.patchDocument);
router.delete("/documents/:id", portal.deleteDocument);

router.get("/notifications", portal.listNotifications);
router.patch("/notifications", portal.patchNotifications);
router.delete("/notifications", portal.deleteNotifications);

router.post("/settings/test-smtp", portal.testSmtp);
router.get("/settings", portal.getSettings);
router.patch("/settings", portal.patchSettings);

router.get("/users", portal.listUsers);
router.delete("/users", portal.bulkDeleteUsers);
router.post("/users/assign", portal.assignUsers);
router.get("/users/:id", portal.getPortalUser);
router.patch("/users/:id", portal.patchPortalUser);
router.delete("/users/:id", portal.deletePortalUser);

module.exports = router;
