import { Response, NextFunction } from 'express';
import { profilesService } from './profiles.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const profilesController = {
  // Candidate profile
  async getCandidateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.getCandidateProfile(req.user!.id)); } catch (err) { next(err); }
  },
  async updateCandidateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.updateCandidateProfile(req.user!.id, req.body)); } catch (err) { next(err); }
  },

  // Resumes
  async uploadResume(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await profilesService.uploadResume(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async setPrimaryResume(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.setPrimaryResume(req.user!.id, req.params.id)); } catch (err) { next(err); }
  },

  // Structured sections
  async saveSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.saveSkills(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async saveWorkExperience(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.saveWorkExperience(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async saveEducation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.saveEducation(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async saveCertifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.saveCertifications(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async saveLanguages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.saveLanguages(req.user!.id, req.body)); } catch (err) { next(err); }
  },

  // Freelance portfolio
  async getPortfolio(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.getPortfolio(req.user!.id)); } catch (err) { next(err); }
  },
  async savePortfolio(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.savePortfolio(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async addProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await profilesService.addProject(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.updateProject(req.user!.id, req.params.id, req.body)); } catch (err) { next(err); }
  },
  async deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.deleteProject(req.user!.id, req.params.id)); } catch (err) { next(err); }
  },
  async addService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await profilesService.addService(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async updateService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.updateService(req.user!.id, req.params.id, req.body)); } catch (err) { next(err); }
  },
  async deleteService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.deleteService(req.user!.id, req.params.id)); } catch (err) { next(err); }
  },
  async getPortfolioReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.getPortfolioReviews(req.user!.id)); } catch (err) { next(err); }
  },

  // Recruiter profile & company
  async getRecruiterProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.getRecruiterProfile(req.user!.id)); } catch (err) { next(err); }
  },
  async getRecruiterTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.getRecruiterTeam(req.user!.id)); } catch (err) { next(err); }
  },
  async updateRecruiterProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.updateRecruiterProfile(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async updateCompany(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.updateCompany(req.user!.id, req.body)); } catch (err) { next(err); }
  },

  // Verification
  async verifyPaymentMethod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.verifyPaymentMethod(req.user!.id, req.body)); } catch (err) { next(err); }
  },
  async verifyCheckoutSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.verifyCheckoutSession(req.user!.id, req.body.sessionId)); } catch (err) { next(err); }
  },
  async submitKyc(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await profilesService.submitKyc(req.user!.id, req.body)); } catch (err) { next(err); }
  },


  // Skills lookup
  async searchSkills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await profilesService.searchSkills(req.query.q as string | undefined)); } catch (err) { next(err); }
  },

  async searchCandidates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await profilesService.searchCandidates(req.query as any));
    } catch (err) { next(err); }
  },
};
