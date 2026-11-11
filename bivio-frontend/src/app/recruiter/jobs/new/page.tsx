'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Switch,
  MenuItem,
  Chip,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { useGetSkillsQuery, useGetRecruiterProfileQuery, useGetPublicSettingsQuery } from '@/store/api/profilesApi';
import {
  useCreateJobMutation,
  useUpdateJobBasicsMutation,
  useUpdateJobRequirementsMutation,
  useUpdateJobCompensationMutation,
  useUpdateJobBenefitsMutation,
  useSetHiringStagesMutation,
  useSetWeightageMutation,
  usePublishJobMutation,
  useGetJobByIdQuery,
  useConfirmPostingFeeMutation,
  useUploadJobFileMutation,
} from '@/store/api/jobsApi';
import type { Job, HiringStage, JobStatus } from '@/types';

const BENEFIT_OPTIONS = ['Health Insurance', 'Flexible Hours', 'Remote Option', 'Stock Options', 'Paid Parental Leave', 'Gym Membership', 'Learning Budget'];

function NewJobWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('id');
  const stepParam = searchParams.get('step');
  const typeParam = searchParams.get('type');

  const dispatch = useDispatch();

  const [customSkillName, setCustomSkillName] = useState('');

  // RTK Query & Mutation Hooks
  const { data: databaseSkillsData } = useGetSkillsQuery(customSkillName);
  const { data: publicSettings } = useGetPublicSettingsQuery();
  const JOB_POSTING_FEE = publicSettings?.JOB_POSTING_FEE ?? 2500;
  const { data: recruiterProfile, isLoading: isProfileLoading, refetch: refetchRecruiterProfile } = useGetRecruiterProfileQuery();
  const { data: existingJob, isLoading: isJobLoading, refetch: refetchJob } = useGetJobByIdQuery(jobIdParam || '', { skip: !jobIdParam });

  const [createJob, { isLoading: isCreatingJob }] = useCreateJobMutation();
  const [updateJobBasics, { isLoading: isUpdatingBasics }] = useUpdateJobBasicsMutation();
  const [updateJobRequirements, { isLoading: isUpdatingReqs }] = useUpdateJobRequirementsMutation();
  const [updateJobCompensation, { isLoading: isUpdatingComp }] = useUpdateJobCompensationMutation();
  const [updateJobBenefits, { isLoading: isUpdatingBenefits }] = useUpdateJobBenefitsMutation();
  const [setHiringStages, { isLoading: isSavingStages }] = useSetHiringStagesMutation();
  const [setWeightage, { isLoading: isSavingWeightage }] = useSetWeightageMutation();
  const [publishJob, { isLoading: isPublishing }] = usePublishJobMutation();
  const [confirmPostingFee, { isLoading: isPayingFee }] = useConfirmPostingFeeMutation();
  const [uploadJobFile, { isLoading: isUploadingFile }] = useUploadJobFileMutation();

  const isSaving = isCreatingJob || isUpdatingBasics || isUpdatingReqs || isUpdatingComp || isUpdatingBenefits || isSavingStages || isSavingWeightage || isPublishing || isPayingFee;

  const [activeStep, setActiveStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const stepVal = new URLSearchParams(window.location.search).get('step');
      if (stepVal) {
        return parseInt(stepVal, 10);
      }
    }
    return 0;
  });
  const verifiedRef = useRef(false);
  const [jobId, setJobId] = useState<string>('');
  const [jobType, setJobType] = useState<'FULL_TIME' | 'FREELANCE'>('FULL_TIME');

  // Shared Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [deadline, setDeadline] = useState('');

  // Step 1: Full-Time specific States
  const [responsibilities, setResponsibilities] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract-to-hire'>('Full-time');
  const [experienceLevel, setExperienceLevel] = useState<'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive'>('Senior');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryVisibility, setSalaryVisibility] = useState(true); // true = Show range, false = Competitive
  const [minExperience, setMinExperience] = useState('');
  const [maxExperience, setMaxExperience] = useState('');
  const [minEducationLevel, setMinEducationLevel] = useState<'High School' | 'Bachelor' | 'Master' | 'PhD' | 'Any'>('Bachelor');
  const [vacancies, setVacancies] = useState(1);
  const [noticePeriod, setNoticePeriod] = useState<'Immediate' | '15' | '30' | '60' | '90' | 'Any'>('Any');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [internalJobCode, setInternalJobCode] = useState('');

  // Step 1: Freelance specific States
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [budgetType, setBudgetType] = useState<'FIXED' | 'HOURLY'>('FIXED');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [projectLength, setProjectLength] = useState<'Under 1 week' | '1–4 weeks' | '1–3 months' | '3+ months'>('1–4 weeks');
  const [freelanceExpLevel, setFreelanceExpLevel] = useState<'Entry' | 'Intermediate' | 'Expert'>('Intermediate');
  const [simulatedFiles, setSimulatedFiles] = useState<string[]>([]);

  // Dynamic lists for customizable skills and benefits
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);

  useEffect(() => {
    if (databaseSkillsData) {
      setAvailableSkills(databaseSkillsData);
    }
  }, [databaseSkillsData]);

  const [availableBenefits, setAvailableBenefits] = useState(BENEFIT_OPTIONS);
  const [customBenefitName, setCustomBenefitName] = useState('');

  const handleAddCustomSkill = () => {
    if (!customSkillName.trim()) return;
    const cleanName = customSkillName.trim();
    const existing = availableSkills.find(s => s.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (!selectedSkills.includes(existing.id)) {
        setSelectedSkills(prev => [...prev, existing.id]);
      }
    } else {
      dispatch(showNotification({
        message: `"${cleanName}" is not in the database. Please select a standard skill from the list.`,
        severity: 'warning'
      }));
    }
    setCustomSkillName('');
  };

  const handleAddCustomBenefit = () => {
    if (!customBenefitName.trim()) return;
    const cleanBenefit = customBenefitName.trim();
    if (!availableBenefits.includes(cleanBenefit)) {
      setAvailableBenefits(prev => [...prev, cleanBenefit]);
    }
    if (!selectedBenefits.includes(cleanBenefit)) {
      setSelectedBenefits(prev => [...prev, cleanBenefit]);
    }
    setCustomBenefitName('');
  };

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationErrorMsg, setValidationErrorMsg] = useState<string | null>(null);

  // Step 2 Payment States
  const [paying, setPaying] = useState(false);

  // Step 3 Stages States (For Full-Time only)
  const [stages, setStages] = useState<HiringStage[]>([]);
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageName, setStageName] = useState('');
  const [stageType, setStageType] = useState<'OA' | 'INTERVIEW' | 'CUSTOM'>('CUSTOM');
  const [stageLink, setStageLink] = useState('');
  const [emailTitle, setEmailTitle] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [prerequisite, setPrerequisite] = useState('');
  const [reqDocFileName, setReqDocFileName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Step 4 Weights States (Full-Time 5 factors)
  const [skillWeight, setSkillWeight] = useState(35);
  const [experienceWeight, setExperienceWeight] = useState(25);
  const [educationWeight, setEducationWeight] = useState(15);
  const [domainWeight, setDomainWeight] = useState(15);
  const [practicalWeight, setPracticalWeight] = useState(10);

  // Step 4 Weights States (Freelance 5 factors)
  const [flSkillWeight, setFlSkillWeight] = useState(35);
  const [flPortfolioWeight, setFlPortfolioWeight] = useState(30);
  const [flRateWeight, setFlRateWeight] = useState(15);
  const [flTrackRecordWeight, setFlTrackRecordWeight] = useState(15);
  const [flAvailabilityWeight, setFlAvailabilityWeight] = useState(5);

  // Dynamically configure steps
  const steps = jobType === 'FULL_TIME'
    ? (recruiterProfile?.postingFeePaid ? ['Basic Info', 'Configure Hiring Stages', 'Configure AI Weightage', 'Review & Publish'] : ['Basic Info', 'Payment', 'Configure Hiring Stages', 'Configure AI Weightage', 'Review & Publish'])
    : (recruiterProfile?.postingFeePaid ? ['Basic Info', 'Configure AI Weightage', 'Review & Publish'] : ['Basic Info', 'Payment', 'Configure AI Weightage', 'Review & Publish']);

  const goToStepIndex = (idx: number) => {
    if (idx >= 0 && idx < steps.length) {
      setActiveStep(idx);
      const params = new URLSearchParams(window.location.search);
      params.set('step', String(idx));
      router.push(`/recruiter/jobs/new?${params.toString()}`);
    }
  };

  const advanceToStep = (stepName: string) => {
    const idx = steps.indexOf(stepName);
    if (idx !== -1) {
      goToStepIndex(idx);
    }
  };

  // Load Job draft if continuing
  useEffect(() => {
    if (existingJob) {
      setJobId(existingJob.id);
      setJobType(existingJob.jobType);
      setTitle(existingJob.title);
      setDescription(existingJob.description);
      setLocation(existingJob.location || '');
      setIsRemote(existingJob.isRemote);
      setSelectedSkills(existingJob.skills?.map((s: any) => s.skillId) || []);
      setCurrency(existingJob.currency || 'INR');
      setDeadline(existingJob.deadline ? new Date(existingJob.deadline).toISOString().split('T')[0] : '');
      setVacancies(existingJob.vacancies);

      if (existingJob.jobType === 'FULL_TIME') {
        setSalaryMin(String(existingJob.salaryMin || '500000'));
        setSalaryMax(String(existingJob.salaryMax || '1500000'));
        if (existingJob.responsibilities) setResponsibilities(existingJob.responsibilities);
        if (existingJob.department) setDepartment(existingJob.department);
        
        if (existingJob.employmentType) {
          const empMap: Record<string, string> = { 'FULL_TIME': 'Full-time', 'PART_TIME': 'Part-time', 'CONTRACT_TO_HIRE': 'Contract-to-hire' };
          setEmploymentType(empMap[existingJob.employmentType] as any || 'Full-time');
        }
        if (existingJob.experienceLevel) {
          const expMap: Record<string, string> = { 'ENTRY': 'Entry', 'MID': 'Mid', 'SENIOR': 'Senior', 'LEAD': 'Lead', 'EXECUTIVE': 'Executive' };
          setExperienceLevel(expMap[existingJob.experienceLevel] as any || 'Senior');
        }
        if (existingJob.salaryVisible !== undefined) setSalaryVisibility(existingJob.salaryVisible);
        if (existingJob.minExperienceYears !== undefined && existingJob.minExperienceYears !== null) setMinExperience(String(existingJob.minExperienceYears));
        if (existingJob.maxExperienceYears !== undefined && existingJob.maxExperienceYears !== null) setMaxExperience(String(existingJob.maxExperienceYears));
        
        if (existingJob.minEducationLevel) {
          const eduMap: Record<string, string> = { 'BACHELORS': 'Bachelor', 'MASTERS': 'Master', 'PHD': 'PhD', 'ANY': 'Any' };
          setMinEducationLevel(eduMap[existingJob.minEducationLevel] as any || 'Bachelor');
        }
        if (existingJob.noticePeriodPreference) {
          const npMap: Record<string, string> = { 'IMMEDIATE': 'Immediate', 'DAYS_15': '15', 'DAYS_30': '30', 'DAYS_60': '60', 'DAYS_90': '90', 'ANY': 'Any' };
          setNoticePeriod(npMap[existingJob.noticePeriodPreference] as any || 'Any');
        }
        if (existingJob.benefits) setSelectedBenefits(existingJob.benefits);
        if (existingJob.internalJobCode) setInternalJobCode(existingJob.internalJobCode);

        if (existingJob.weightage) {
          const w = existingJob.weightage;
          if (w.skillWeight !== undefined) setSkillWeight(w.skillWeight);
          if (w.experienceWeight !== undefined) setExperienceWeight(w.experienceWeight);
          if (w.educationWeight !== undefined) setEducationWeight(w.educationWeight);
          if (w.domainWeight !== undefined) setDomainWeight(w.domainWeight);
          if (w.practicalFitWeight !== undefined) setPracticalWeight(w.practicalFitWeight);
        }
      } else {
        if (existingJob.budget) setBudgetAmount(String(existingJob.budget));
        if (existingJob.budgetType) setBudgetType(existingJob.budgetType);
        if (existingJob.deliverables) setDeliverables(existingJob.deliverables);
        if ((existingJob as any).attachments) setSimulatedFiles((existingJob as any).attachments);
        // For freelance jobs, the bid submission deadline is stored in proposalDeadline
        if (existingJob.proposalDeadline) setDeadline(new Date(existingJob.proposalDeadline).toISOString().split('T')[0]);
        
        if (existingJob.projectLengthEstimate) {
          const plMap: Record<string, string> = { 'UNDER_1_WEEK': 'Under 1 week', 'W1_4': '1–4 weeks', 'M1_3': '1–3 months', 'M3_PLUS': '3+ months' };
          setProjectLength(plMap[existingJob.projectLengthEstimate] as any || '1–4 weeks');
        }
        if (existingJob.freelanceExperienceLevel) {
          const flExpMap: Record<string, string> = { 'ENTRY': 'Entry', 'INTERMEDIATE': 'Intermediate', 'EXPERT': 'Expert' };
          setFreelanceExpLevel(flExpMap[existingJob.freelanceExperienceLevel] as any || 'Intermediate');
        }

        if (existingJob.weightage) {
          const w = existingJob.weightage;
          if (w.skillWeight !== undefined) setFlSkillWeight(w.skillWeight);
          if (w.portfolioWeight !== undefined) setFlPortfolioWeight(w.portfolioWeight);
          if (w.rateFitWeight !== undefined) setFlRateWeight(w.rateFitWeight);
          if (w.trackRecordWeight !== undefined) setFlTrackRecordWeight(w.trackRecordWeight);
          if (w.availabilityWeight !== undefined) setFlAvailabilityWeight(w.availabilityWeight);
        }
      }

      if (existingJob.hiringStages && existingJob.hiringStages.length > 0) {
        setStages(existingJob.hiringStages);
      } else {
        setStages([
          { id: `${existingJob.id}-st-screening`, jobId: existingJob.id, name: 'Screening', sequence: 1, stageType: 'SCREENING', isTerminal: false },
          { id: `${existingJob.id}-st-offer`, jobId: existingJob.id, name: 'Offer', sequence: 2, stageType: 'OFFER', isTerminal: true }
        ]);
      }

      if (stepParam) {
        const stepVal = parseInt(stepParam, 10);
        if (stepVal === 1 && recruiterProfile?.postingFeePaid) {
          advanceToStep(existingJob.jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
        } else {
          setActiveStep(stepVal);
        }
      } else {
        if (existingJob.status === 'DRAFT') {
          if (recruiterProfile?.postingFeePaid) {
            advanceToStep(existingJob.jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
          } else {
            advanceToStep('Payment');
          }
        } else if (existingJob.status === 'CONFIGURING') {
          advanceToStep(existingJob.jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
        }
      }
    } else if (!jobIdParam) {
      const newId = `job-${Date.now()}`;
      setJobId(newId);
      if (typeParam === 'freelance') {
        setJobType('FREELANCE');
      } else {
        setJobType('FULL_TIME');
      }
      setStages([
        { id: `${newId}-st-screening`, jobId: newId, name: 'Screening', sequence: 1, stageType: 'SCREENING', isTerminal: false },
        { id: `${newId}-st-offer`, jobId: newId, name: 'Offer', sequence: 2, stageType: 'OFFER', isTerminal: true }
      ]);
    }
  }, [existingJob, jobIdParam, stepParam, typeParam, recruiterProfile]);

  const sessionIdParam = searchParams.get('session_id');

  useEffect(() => {
    const checkPaymentSession = async () => {
      if (sessionIdParam && !verifiedRef.current) {
        verifiedRef.current = true;
        setPaying(true);
        try {
          const res = await confirmPostingFee({ sessionId: sessionIdParam, jobId: jobIdParam || jobId }).unwrap();
          if (res.postingFeePaid) {
            dispatch(showNotification({ message: 'Stripe payment verified successfully!', severity: 'success' }));
            await refetchRecruiterProfile();
            if (jobIdParam) {
              await refetchJob();
            }
            advanceToStep(jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
          }
        } catch (err: any) {
          dispatch(showNotification({ message: err.data?.message || 'Failed to verify payment.', severity: 'error' }));
        } finally {
          setPaying(false);
        }
      }
    };
    if (sessionIdParam && (jobId || jobIdParam)) {
      checkPaymentSession();
    }
  }, [sessionIdParam, jobId, jobIdParam]);

  // Add Deliverable Helper
  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables(prev => [...prev, newDeliverable.trim()]);
    setNewDeliverable('');
  };

  const removeDeliverable = (idx: number) => {
    setDeliverables(prev => prev.filter((_, i) => i !== idx));
  };

  // Step 1: Save
  // Helper to map values to DB compliant enums
  const getPayload = () => {
    const skillIds = selectedSkills;

    const empMap: Record<string, string> = { 'Full-time': 'FULL_TIME', 'Part-time': 'PART_TIME', 'Contract-to-hire': 'CONTRACT_TO_HIRE' };
    const expMap: Record<string, string> = { 'Entry': 'ENTRY', 'Mid': 'MID', 'Senior': 'SENIOR', 'Lead': 'LEAD', 'Executive': 'EXECUTIVE' };
    const eduMap: Record<string, string> = { 'Bachelor': 'BACHELORS', 'Master': 'MASTERS', 'PhD': 'PHD', 'Any': 'ANY', 'High School': 'ANY' };
    const npMap: Record<string, string> = { 'Immediate': 'IMMEDIATE', '15': 'DAYS_15', '30': 'DAYS_30', '60': 'DAYS_60', '90': 'DAYS_90', 'Any': 'ANY' };
    const flExpMap: Record<string, string> = { 'Entry': 'ENTRY', 'Intermediate': 'INTERMEDIATE', 'Expert': 'EXPERT' };
    const plMap: Record<string, string> = { 'Under 1 week': 'UNDER_1_WEEK', '1–4 weeks': 'W1_4', '1–3 months': 'M1_3', '3+ months': 'M3_PLUS' };

    const common = {
      title,
      description,
      location: location || 'Remote',
      isRemote,
      skillIds,
      mandatorySkillIds: skillIds.slice(0, 2),
      currency,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    };

    if (jobType === 'FULL_TIME') {
      return {
        ...common,
        jobType: 'FULL_TIME' as const,
        employmentType: (empMap[employmentType] || 'FULL_TIME') as any,
        experienceLevel: (expMap[experienceLevel] || 'SENIOR') as any,
        department: department || undefined,
        responsibilities: responsibilities || undefined,
        salaryMin: Number(salaryMin),
        salaryMax: Number(salaryMax),
        salaryVisible: salaryVisibility,
        minExperienceYears: Number(minExperience),
        maxExperienceYears: Number(maxExperience) || undefined,
        minEducationLevel: (eduMap[minEducationLevel] || 'BACHELORS') as any,
        noticePeriodPreference: (npMap[noticePeriod] || 'ANY') as any,
        vacancies: Number(vacancies),
        benefits: selectedBenefits,
        internalJobCode: internalJobCode || undefined,
      };
    } else {
      return {
        ...common,
        jobType: 'FREELANCE' as const,
        deliverables,
        attachments: simulatedFiles,
        budgetType: budgetType as any,
        budget: Number(budgetAmount),
        freelanceExperienceLevel: (flExpMap[freelanceExpLevel] || 'INTERMEDIATE') as any,
        projectLengthEstimate: (plMap[projectLength] || 'W1_4') as any,
        proposalDeadline: deadline ? new Date(deadline).toISOString() : undefined,
      };
    }
  };

  // Step 1: Save
  const handleSaveStep1 = async () => {
    setValidationErrorMsg(null);
    setShowValidationErrors(false);

    if (!title.trim() || !description.trim()) {
      setValidationErrorMsg('Please fill out Title and Description.');
      setShowValidationErrors(true);
      return;
    }

    if (selectedSkills.length === 0) {
      setValidationErrorMsg('Please select at least one required skill.');
      setShowValidationErrors(true);
      return;
    }

    if (jobType === 'FULL_TIME') {
      if (!responsibilities.trim() || !minExperience || !minEducationLevel) {
        setValidationErrorMsg('Please fill out all required fields marked with *');
        setShowValidationErrors(true);
        return;
      }
      if (Number(salaryMin) > Number(salaryMax)) {
        setValidationErrorMsg('Minimum salary cannot exceed maximum salary.');
        setShowValidationErrors(true);
        return;
      }
      if (maxExperience && Number(minExperience) > Number(maxExperience)) {
        setValidationErrorMsg('Minimum experience cannot exceed maximum experience.');
        setShowValidationErrors(true);
        return;
      }
    } else {
      if (deliverables.length === 0) {
        setValidationErrorMsg('Please add at least one Deliverable for the freelance project.');
        setShowValidationErrors(true);
        return;
      }
      if (!budgetAmount || Number(budgetAmount) <= 0) {
        setValidationErrorMsg(budgetType === 'FIXED' ? 'Please specify a valid budget amount.' : 'Please specify a valid hourly rate.');
        setShowValidationErrors(true);
        return;
      }
    }

    try {
      const payload = getPayload();
      let savedJob: any;

      if (!jobIdParam) {
        savedJob = await createJob(payload).unwrap();
        const nextStepName = savedJob.status === 'DRAFT' && !recruiterProfile?.postingFeePaid ? 'Payment' : (jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
        const nextStepIdx = steps.indexOf(nextStepName);
        router.push(`/recruiter/jobs/new?id=${savedJob.id}&step=${nextStepIdx !== -1 ? nextStepIdx : 1}&type=${jobType.toLowerCase()}`);
        setJobId(savedJob.id);
        dispatch(showNotification({ message: 'Job draft created successfully.', severity: 'success' }));
      } else {
        savedJob = await updateJobBasics({
          id: jobIdParam,
          title: payload.title,
          description: payload.description,
          responsibilities: (payload as any).responsibilities,
          location: payload.location,
          isRemote: payload.isRemote,
          skillIds: payload.skillIds,
          mandatorySkillIds: payload.mandatorySkillIds,
          currency: payload.currency,
          deadline: jobType === 'FULL_TIME' ? payload.deadline : undefined,
          department: (payload as any).department,
          employmentType: (payload as any).employmentType,
          experienceLevel: (payload as any).experienceLevel,
        }).unwrap();

        if (jobType === 'FULL_TIME') {
          await updateJobRequirements({
            id: jobIdParam,
            minExperienceYears: (payload as any).minExperienceYears,
            maxExperienceYears: (payload as any).maxExperienceYears,
            minEducationLevel: (payload as any).minEducationLevel,
            noticePeriodPreference: (payload as any).noticePeriodPreference,
          }).unwrap();
        }

        await updateJobCompensation({
          id: jobIdParam,
          salaryMin: (payload as any).salaryMin,
          salaryMax: (payload as any).salaryMax,
          salaryVisible: (payload as any).salaryVisible,
          vacancies: (payload as any).vacancies,
          internalJobCode: (payload as any).internalJobCode,
          currency: payload.currency,
          budget: (payload as any).budget,
          budgetType: (payload as any).budgetType,
          deliverables: (payload as any).deliverables,
          attachments: (payload as any).attachments,
          freelanceExperienceLevel: (payload as any).freelanceExperienceLevel,
          projectLengthEstimate: (payload as any).projectLengthEstimate,
          proposalDeadline: (payload as any).proposalDeadline,
        }).unwrap();

        if (jobType === 'FULL_TIME') {
          await updateJobBenefits({
            id: jobIdParam,
            benefits: (payload as any).benefits || [],
          }).unwrap();
        }

        dispatch(showNotification({ message: 'Job draft updated successfully.', severity: 'success' }));
      }

      // Read status from savedJob or existingJob
      const status = savedJob?.status || existingJob?.status || 'DRAFT';
      if (status === 'DRAFT' && !recruiterProfile?.postingFeePaid) {
        advanceToStep('Payment');
      } else {
        advanceToStep(jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
      }
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Failed to save job draft.', severity: 'error' }));
    }
  };

  // Step 2: Pay fee
  const handlePayment = async () => {
    setPaying(true);
    try {
      const res = await confirmPostingFee({ jobId: jobId || jobIdParam || undefined }).unwrap();
      if (res.checkoutUrl) {
        // Redirect to Stripe Checkout Session
        window.location.href = res.checkoutUrl;
        return;
      }

      dispatch(showNotification({ message: 'One-time posting fee confirmed successfully!', severity: 'success' }));
      await refetchRecruiterProfile();
      if (jobIdParam) {
        await refetchJob();
      }
      advanceToStep(jobType === 'FULL_TIME' ? 'Configure Hiring Stages' : 'Configure AI Weightage');
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Payment confirmation failed.', severity: 'error' }));
    } finally {
      setPaying(false);
    }
  };

  // Step 3: Hiring Stages (locked anchors Screening & Offer)
  const addStage = () => {
    setModalError(null);
    if (!stageName.trim()) {
      setModalError('Stage Name is required.');
      return;
    }

    if (stageType === 'OA') {
      if (!stageLink.trim()) {
        setModalError('Link is required.');
        return;
      }
      try {
        const parsed = new URL(stageLink);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setModalError('Link must start with http:// or https://');
          return;
        }
      } catch (_) {
        setModalError('Please enter a valid URL link (e.g. https://example.com).');
        return;
      }
    }

    if (stageType === 'OA' || stageType === 'INTERVIEW') {
      if (!emailTitle.trim()) {
        setModalError('Email Invitation Title is required.');
        return;
      }
      if (!emailBody.trim()) {
        setModalError('Email Invitation Body is required.');
        return;
      }
    }

    const newStage: HiringStage = {
      id: `${jobId}-st-${Date.now()}`,
      jobId,
      name: stageName,
      sequence: stages.length,
      stageType,
      isTerminal: false,
      automationLink: stageLink || null,
      emailSubject: emailTitle || null,
      emailBodyTemplate: emailBody || null,
      prerequisite: prerequisite || null,
      requirementDocFileName: reqDocFileName || null,
      requirementDocUrl: null,
    };

    // Insert just before the last stage ("Offer")
    const updatedStages = [...stages];
    updatedStages.splice(stages.length - 1, 0, newStage);
    
    // Re-sequence
    const resequenced = updatedStages.map((s, idx) => ({ ...s, sequence: idx + 1 }));

    setStages(resequenced);
    setStageName('');
    setStageLink('');
    setEmailTitle('');
    setEmailBody('');
    setPrerequisite('');
    setReqDocFileName('');
    setModalError(null);
    setShowStageModal(false);
  };

  const removeStage = (id: string) => {
    // Never delete anchors
    const stage = stages.find(s => s.id === id);
    if (stage?.name === 'Screening' || stage?.name === 'Offer') return;

    const updated = stages.filter(s => s.id !== id).map((s, idx) => ({ ...s, sequence: idx + 1 }));
    setStages(updated);
  };

  const moveStage = (index: number, direction: 'UP' | 'DOWN') => {
    // Screening (index 0) and Offer (last index) are locked anchors.
    if (direction === 'UP' && index === 1) return; // Can't move before Screening
    if (direction === 'DOWN' && index === stages.length - 2) return; // Can't move after Offer

    const updated = [...stages];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    setStages(updated.map((s, idx) => ({ ...s, sequence: idx + 1 })));
  };

  // Step 3 (Stages for Full-Time) OR step 3 (Weights for Freelance)
  const handleSaveStages = async () => {
    setValidationErrorMsg(null);
    setShowValidationErrors(false);
    
    const customStages = stages.filter(s => s.name !== 'Screening' && s.name !== 'Offer');

    try {
      await setHiringStages({
        id: jobId,
        stages: customStages.map(s => ({
          name: s.name,
          stageType: s.stageType as any,
          automationLink: s.automationLink || undefined,
          emailSubject: s.emailSubject || undefined,
          emailBodyTemplate: s.emailBodyTemplate || undefined,
          prerequisite: s.prerequisite || undefined,
          requirementDocFileName: s.requirementDocFileName || undefined,
        }))
      }).unwrap();

      dispatch(showNotification({ message: 'Hiring stages saved successfully.', severity: 'success' }));
      advanceToStep('Configure AI Weightage');
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Failed to save hiring stages.', severity: 'error' }));
    }
  };

  // Step 4 Weights
  const currentTotalWeight = jobType === 'FULL_TIME'
    ? skillWeight + experienceWeight + educationWeight + domainWeight + practicalWeight
    : flSkillWeight + flPortfolioWeight + flRateWeight + flTrackRecordWeight + flAvailabilityWeight;

  const handleSaveWeights = async () => {
    setValidationErrorMsg(null);
    setShowValidationErrors(false);
    if (currentTotalWeight !== 100) {
      setValidationErrorMsg('Total weights must sum to exactly 100%');
      setShowValidationErrors(true);
      return;
    }
    try {
      const payload = {
        id: jobId,
        skillWeight: jobType === 'FULL_TIME' ? skillWeight : flSkillWeight,
        experienceWeight: jobType === 'FULL_TIME' ? experienceWeight : 0,
        educationWeight: jobType === 'FULL_TIME' ? educationWeight : 0,
        domainWeight: jobType === 'FULL_TIME' ? domainWeight : 0,
        practicalFitWeight: jobType === 'FULL_TIME' ? practicalWeight : 0,
        portfolioWeight: jobType === 'FREELANCE' ? flPortfolioWeight : 0,
        rateFitWeight: jobType === 'FREELANCE' ? flRateWeight : 0,
        trackRecordWeight: jobType === 'FREELANCE' ? flTrackRecordWeight : 0,
        availabilityWeight: jobType === 'FREELANCE' ? flAvailabilityWeight : 0,
      };

      await setWeightage(payload).unwrap();
      dispatch(showNotification({ message: 'AI weightage matching configurations saved successfully.', severity: 'success' }));
      advanceToStep('Review & Publish');
    } catch (err: any) {
      dispatch(showNotification({ message: err.data?.message || 'Failed to save AI weightage.', severity: 'error' }));
    }
  };

  // Step 5 Publish Validation
  const validatePublish = () => {
    if (jobType === 'FULL_TIME') {
      const hasScreening = stages.some(s => s.name === 'Screening');
      const hasOffer = stages.some(s => s.name === 'Offer');
      if (!hasScreening || !hasOffer) return 'Hiring pipeline must contain Screening and Offer anchors.';
      if (currentTotalWeight !== 100) return 'AI Weights must sum to exactly 100%.';

      for (const stage of stages) {
        if (stage.stageType === 'OA' || stage.stageType === 'INTERVIEW') {
          if (!stage.automationLink || !stage.emailSubject || !stage.emailBodyTemplate) {
            return `Stage "${stage.name}" requires Link, Email Title, and Email Body for automated invitations.`;
          }
        }
      }
    } else {
      if (deliverables.length === 0) return 'At least one deliverable is required.';
      if (currentTotalWeight !== 100) return 'AI Weights must sum to exactly 100%.';
    }
    return null;
  };

  const handlePublish = async () => {
    setValidationErrorMsg(null);
    setShowValidationErrors(false);
    const errorMsg = validatePublish();
    if (errorMsg) {
      setValidationErrorMsg(errorMsg);
      setShowValidationErrors(true);
      return;
    }

    try {
      await publishJob(jobId).unwrap();
      dispatch(showNotification({ message: 'Job posting published successfully!', severity: 'success' }));
      router.push('/recruiter/jobs');
    } catch (err: any) {
      if (err.status === 402 || err.data?.error === 'PAYMENT_REQUIRED') {
        dispatch(showNotification({ message: 'A one-time platform unlock fee is required to publish this job.', severity: 'warning' }));
        advanceToStep('Payment');
      } else {
        dispatch(showNotification({ message: err.data?.message || 'Failed to publish job.', severity: 'error' }));
      }
    }
  };

  // Check which step layout to show
  const currentStepName = steps[activeStep];
  const showStagesStep = currentStepName === 'Configure Hiring Stages';
  const showWeightsStep = currentStepName === 'Configure AI Weightage';
  const showReviewStep = currentStepName === 'Review & Publish';
  const showPaymentStep = currentStepName === 'Payment';
  const showBasicInfoStep = currentStepName === 'Basic Info';

  if (isProfileLoading || (jobIdParam && isJobLoading)) {
    return (
      <Container sx={{ py: 15 }}>
        <Stack spacing={3} alignItems="center" justifyContent="center">
          <CircularProgress size={50} thickness={4} sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 750, color: 'text.secondary', fontFamily: 'Outfit, sans-serif' }}>
            Loading wizard settings...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 855, mb: 4, textAlign: 'center', color: jobType === 'FREELANCE' ? 'secondary.main' : 'primary.main' }}>
        Create Job Posting
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* STEP 1: BASIC INFO */}
      {showBasicInfoStep && (
        <Card sx={{ borderRadius: 4, p: 2 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Job Details Specification</Typography>

            {showValidationErrors && validationErrorMsg && (
              <Alert severity="error" sx={{ mb: 1, fontWeight: 700 }}>
                {validationErrorMsg}
              </Alert>
            )}

            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>Job Posting Classification</FormLabel>
              <RadioGroup row value={jobType} onChange={(e) => setJobType(e.target.value as any)}>
                <FormControlLabel value="FULL_TIME" control={<Radio />} label="Full-Time Placement Flow" />
                <FormControlLabel value="FREELANCE" control={<Radio />} label="Freelance Project Scoping" />
              </RadioGroup>
            </FormControl>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Job Title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  error={showValidationErrors && !title.trim()}
                  helperText={showValidationErrors && !title.trim() ? "Job Title is required" : ""}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Internal Job Code (Optional)" value={internalJobCode} onChange={(e) => setInternalJobCode(e.target.value)} fullWidth />
              </Grid>
            </Grid>

            <TextField
              label="Overview / Description"
              required
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              placeholder="What project goals or role tasks need solving..."
              error={showValidationErrors && !description.trim()}
              helperText={showValidationErrors && !description.trim() ? "Job Description is required" : ""}
            />

            {/* FULL TIME SPECIFIC FIELDS */}
            {jobType === 'FULL_TIME' && (
              <>
                <TextField
                  label="Key Responsibilities"
                  required
                  multiline
                  rows={4}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  fullWidth
                  placeholder="Detail the daily responsibilities..."
                  error={showValidationErrors && !responsibilities.trim()}
                  helperText={showValidationErrors && !responsibilities.trim() ? "Responsibilities are required" : ""}
                />

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField select label="Employment Type" value={employmentType} onChange={(e) => setEmploymentType(e.target.value as any)} fullWidth>
                      <MenuItem value="Full-time">Full-time</MenuItem>
                      <MenuItem value="Part-time">Part-time</MenuItem>
                      <MenuItem value="Contract-to-hire">Contract-to-hire</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField select label="Experience Level Required" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as any)} fullWidth>
                      <MenuItem value="Entry">Entry</MenuItem>
                      <MenuItem value="Mid">Mid</MenuItem>
                      <MenuItem value="Senior">Senior</MenuItem>
                      <MenuItem value="Lead">Lead</MenuItem>
                      <MenuItem value="Executive">Executive</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>

                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} fullWidth>
                      <MenuItem value="INR">INR (₹)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField label="Min Salary" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField label="Max Salary" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControlLabel
                      control={<Switch checked={salaryVisibility} onChange={(e) => setSalaryVisibility(e.target.checked)} />}
                      label={salaryVisibility ? 'Show Range' : 'Competitive'}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Min Experience (Years)" type="number" required value={minExperience} onChange={(e) => setMinExperience(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Max Experience (Years)" type="number" value={maxExperience} onChange={(e) => setMaxExperience(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField select label="Min Education Level" required value={minEducationLevel} onChange={(e) => setMinEducationLevel(e.target.value as any)} fullWidth>
                      <MenuItem value="Any">Any</MenuItem>
                      <MenuItem value="High School">High School</MenuItem>
                      <MenuItem value="Bachelor">Bachelor</MenuItem>
                      <MenuItem value="Master">Master</MenuItem>
                      <MenuItem value="PhD">PhD</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Vacancies" type="number" value={isNaN(vacancies) || vacancies === null || vacancies === undefined ? '' : vacancies} onChange={(e) => setVacancies(e.target.value === '' ? '' as any : parseInt(e.target.value, 10))} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField select label="Notice Period Preference" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value as any)} fullWidth>
                      <MenuItem value="Any">Any Notice Period</MenuItem>
                      <MenuItem value="Immediate">Immediate Joining</MenuItem>
                      <MenuItem value="15">15 Days</MenuItem>
                      <MenuItem value="30">30 Days</MenuItem>
                      <MenuItem value="60">60 Days</MenuItem>
                      <MenuItem value="90">90 Days</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Deadline Date" type="date" InputLabelProps={{ shrink: true }} value={deadline} onChange={(e) => setDeadline(e.target.value)} fullWidth />
                  </Grid>
                </Grid>

                <FormControl fullWidth>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Job Benefits &amp; Perks</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      placeholder="Add custom benefit (e.g. Wellness allowance)"
                      value={customBenefitName}
                      onChange={(e) => setCustomBenefitName(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddCustomBenefit}>Add</Button>
                  </Stack>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {availableBenefits.map((benefit) => {
                      const isSelected = selectedBenefits.includes(benefit);
                      return (
                        <Chip
                          key={benefit}
                          label={benefit}
                          color={isSelected ? 'secondary' : 'default'}
                          onClick={() => {
                            setSelectedBenefits(prev =>
                              isSelected ? prev.filter(b => b !== benefit) : [...prev, benefit]
                            );
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Box>
                </FormControl>
              </>
            )}

            {/* FREELANCE SPECIFIC FIELDS */}
            {jobType === 'FREELANCE' && (
              <>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Deliverables List *</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      placeholder="Add structured deliverable (e.g. Working escrow release transaction)"
                      value={newDeliverable}
                      onChange={(e) => setNewDeliverable(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={addDeliverable}>Add</Button>
                  </Stack>
                  <List sx={{ border: '1px solid #cbd5e1', borderRadius: 2, p: 0 }}>
                    {deliverables.map((item, idx) => (
                      <ListItem key={idx} divider={idx < deliverables.length - 1}>
                        <ListItemText primary={item} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                        <ListItemSecondaryAction>
                          <IconButton size="small" onClick={() => removeDeliverable(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>Budget Type</FormLabel>
                  <RadioGroup row value={budgetType} onChange={(e) => setBudgetType(e.target.value as any)}>
                    <FormControlLabel value="FIXED" control={<Radio />} label="Fixed Project Rate" />
                    <FormControlLabel value="HOURLY" control={<Radio />} label="Hourly Contracting Rate" />
                  </RadioGroup>
                </FormControl>

                <TextField
                  label={budgetType === 'FIXED' ? "Total Fixed Budget (₹)" : "Hourly Rate (₹)"}
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  fullWidth
                />

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField select label="Project Length Estimate" value={projectLength} onChange={(e) => setProjectLength(e.target.value as any)} fullWidth>
                      <MenuItem value="Under 1 week">Under 1 week</MenuItem>
                      <MenuItem value="1–4 weeks">1–4 weeks</MenuItem>
                      <MenuItem value="1–3 months">1–3 months</MenuItem>
                      <MenuItem value="3+ months">3+ months</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField select label="Experience Level Needed" value={freelanceExpLevel} onChange={(e) => setFreelanceExpLevel(e.target.value as any)} fullWidth>
                      <MenuItem value="Entry">Entry</MenuItem>
                      <MenuItem value="Intermediate">Intermediate</MenuItem>
                      <MenuItem value="Expert">Expert</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Bids Submission Deadline" type="date" InputLabelProps={{ shrink: true }} value={deadline} onChange={(e) => setDeadline(e.target.value)} fullWidth />
                  </Grid>
                </Grid>

                <TextField
                  label="Location Preference (Optional)"
                  placeholder="e.g. Remote (default), India only"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  fullWidth
                />

                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Project Brief Attachments</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
                    <Button
                      variant="outlined"
                      color="secondary"
                      component="label"
                      startIcon={<AttachFileIcon />}
                      disabled={isUploadingFile}
                      sx={{ fontWeight: 700 }}
                    >
                      {isUploadingFile ? 'Uploading...' : 'Choose & Upload File'}
                      <input
                        type="file"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const base64Data = (reader.result as string).split(',')[1];
                              const res = await uploadJobFile({ fileName: file.name, base64Data }).unwrap();
                              setSimulatedFiles(prev => [...prev, res.fileUrl]);
                              dispatch(showNotification({ message: 'File uploaded successfully!', severity: 'success' }));
                            };
                            reader.readAsDataURL(file);
                          } catch (err: any) {
                            dispatch(showNotification({ message: err.data?.message || 'Upload failed', severity: 'error' }));
                          }
                        }}
                      />
                    </Button>
                  </Stack>
                  {simulatedFiles.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1.5, border: '1px solid #cbd5e1', borderRadius: 2 }}>
                      {simulatedFiles.map((file) => {
                        const fileName = file.substring(file.lastIndexOf('/') + 1).replace(/^\d+-/, '');
                        return (
                          <Chip
                            key={file}
                            label={fileName}
                            onDelete={() => setSimulatedFiles(prev => prev.filter(f => f !== file))}
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </>
            )}

            <FormControl fullWidth>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Required Candidate Skills</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  placeholder="Add custom required skill (e.g. Rust, Go, TensorFlow)"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddCustomSkill}>Add</Button>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1.5, border: '1px solid #cbd5e1', borderRadius: 2 }}>
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.id);
                  return (
                    <Chip
                      key={skill.id}
                      label={skill.name}
                      color={isSelected ? 'primary' : 'default'}
                      onClick={() => {
                        setSelectedSkills(prev =>
                          isSelected ? prev.filter(id => id !== skill.id) : [...prev, skill.id]
                        );
                      }}
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                  );
                })}
              </Box>
            </FormControl>

            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Button variant="outlined" disabled={isSaving} onClick={() => router.push('/recruiter/jobs')}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveStep1} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ px: 4 }}>
                {isSaving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: PAYMENT */}
      {showPaymentStep && (
        <Card sx={{ borderRadius: 4, p: 3, textAlign: 'center' }}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              One-Time Platform Fee Setup
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
              Unlock job postings permanently for your profile. Pay once, publish unlimited roles.
            </Typography>

            <Box sx={{ bgcolor: 'rgba(37, 99, 235, 0.03)', border: '1px solid #e2e8f0', borderRadius: 4, p: 4, maxWidth: 400, mx: 'auto', mb: 4 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                ONE-TIME SUBSCRIPTION UNLOCK
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', mt: 1 }}>
                ₹{JOB_POSTING_FEE}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Covers this and every future job posting you list on Bivio.
              </Typography>
            </Box>

            {paying ? (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Simulating Secure Payment Gateway...</Typography>
              </Stack>
            ) : (
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="outlined" onClick={() => advanceToStep('Basic Info')}>Back</Button>
                <Button variant="contained" size="large" onClick={handlePayment} sx={{ px: 4, fontWeight: 700 }}>
                  Pay ₹{JOB_POSTING_FEE} &amp; Unlock
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3 FOR FULL-TIME: STAGES SETUP */}
      {showStagesStep && (
        <Card sx={{ borderRadius: 4, p: 2 }}>
          <CardContent>
            {showValidationErrors && validationErrorMsg && (
              <Alert severity="error" sx={{ mb: 2, fontWeight: 700 }}>
                {validationErrorMsg}
              </Alert>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Configure Hiring Pipeline</Typography>
                <Typography variant="caption" color="text.secondary">
                  Add assessment, OA, or interview rounds between the fixed Screening and Offer anchors.
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setModalError(null); setShowStageModal(true); }} sx={{ fontWeight: 700 }}>
                Add Stage
              </Button>
            </Stack>

            <List sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 0, mb: 4, overflow: 'hidden' }}>
              {stages.map((stage, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === stages.length - 1;
                return (
                  <ListItem key={stage.id} divider={idx < stages.length - 1} sx={{ bgcolor: (isFirst || isLast) ? 'rgba(0,0,0,0.02)' : 'inherit', py: 2 }}>
                    <ListItemText
                      primary={stage.name}
                      primaryTypographyProps={{ fontWeight: 750 }}
                      secondary={isFirst ? 'Fixed Entry Anchor (Screening)' : isLast ? 'Fixed Terminal Anchor (Offer)' : `Evaluation round (${stage.stageType})`}
                    />
                    {!isFirst && !isLast && (
                      <ListItemSecondaryAction>
                        <IconButton size="small" disabled={idx === 1} onClick={() => moveStage(idx, 'UP')}>
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" disabled={idx === stages.length - 2} onClick={() => moveStage(idx, 'DOWN')}>
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeStage(stage.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>

            <Stack direction="row" justifyContent="space-between">
              <Button variant="outlined" disabled={isSaving} onClick={() => goToStepIndex(activeStep - 1)}>Back</Button>
              <Button variant="contained" onClick={handleSaveStages} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ px: 4 }}>
                {isSaving ? 'Saving...' : 'Continue'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: AI WEIGHTAGE (Differentiated per jobType) */}
      {showWeightsStep && (
        <Card sx={{ borderRadius: 4, p: 2 }}>
          <CardContent>
            {showValidationErrors && validationErrorMsg && (
              <Alert severity="error" sx={{ mb: 2, fontWeight: 700 }}>
                {validationErrorMsg}
              </Alert>
            )}
            {jobType === 'FULL_TIME' ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Configure 5-Factor AI Match Weights (Full-Time)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Define parameters predictive of long-term placement fit. Must sum to exactly 100%.
                </Typography>

                <Stack spacing={4} sx={{ mb: 4 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Skill Match ({skillWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Required skill overlap (mandatory weighted higher)</Typography>
                    </Stack>
                    <Slider value={skillWeight} onChange={(_, val) => setSkillWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Experience Match ({experienceWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Years experience proximity to job band</Typography>
                    </Stack>
                    <Slider value={experienceWeight} onChange={(_, val) => setExperienceWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Education Match ({educationWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Minimum education level thresholds</Typography>
                    </Stack>
                    <Slider value={educationWeight} onChange={(_, val) => setEducationWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Domain Relevance ({domainWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Past employer industries vs job department</Typography>
                    </Stack>
                    <Slider value={domainWeight} onChange={(_, val) => setDomainWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Practical Fit ({practicalWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Notice period and location/remote alignment</Typography>
                    </Stack>
                    <Slider value={practicalWeight} onChange={(_, val) => setPracticalWeight(val as number)} max={100} />
                  </Box>
                </Stack>
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Configure 5-Factor AI Match Weights (Freelance)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Define parameters predictive of project delivery success. Must sum to exactly 100%.
                </Typography>

                <Stack spacing={4} sx={{ mb: 4 }}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Skill Match ({flSkillWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Skill overlap between project requirements and bidder</Typography>
                    </Stack>
                    <Slider value={flSkillWeight} onChange={(_, val) => setFlSkillWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Portfolio / Project Match ({flPortfolioWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Freelancer past project case studies alignment</Typography>
                    </Stack>
                    <Slider value={flPortfolioWeight} onChange={(_, val) => setFlPortfolioWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Rate Fit ({flRateWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Proposed contract rates proximity to project budget</Typography>
                    </Stack>
                    <Slider value={flRateWeight} onChange={(_, val) => setFlRateWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Track Record ({flTrackRecordWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Avg reviews rating + total completed contract counts</Typography>
                    </Stack>
                    <Slider value={flTrackRecordWeight} onChange={(_, val) => setFlTrackRecordWeight(val as number)} max={100} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Availability Fit ({flAvailabilityWeight}%)</Typography>
                      <Typography variant="caption" color="text.secondary">Bidder weekly capacity vs project length schedule</Typography>
                    </Stack>
                    <Slider value={flAvailabilityWeight} onChange={(_, val) => setFlAvailabilityWeight(val as number)} max={100} />
                  </Box>
                </Stack>
              </>
            )}

            <Alert severity={currentTotalWeight === 100 ? 'success' : 'error'} sx={{ mb: 4, fontWeight: 700 }}>
              Live Match Weight Sum: {currentTotalWeight}% {currentTotalWeight !== 100 && ' (Must sum to exactly 100%)'}
            </Alert>

            <Stack direction="row" justifyContent="space-between">
              <Button variant="outlined" disabled={isSaving} onClick={() => goToStepIndex(activeStep - 1)}>Back</Button>
              <Button variant="contained" onClick={handleSaveWeights} disabled={currentTotalWeight !== 100 || isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ px: 4 }}>
                {isSaving ? 'Saving...' : 'Continue'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: REVIEW & PUBLISH */}
      {showReviewStep && (
        <Card sx={{ borderRadius: 4, p: 2 }}>
          <CardContent>
            {showValidationErrors && validationErrorMsg && (
              <Alert severity="error" sx={{ mb: 2, fontWeight: 700 }}>
                {validationErrorMsg}
              </Alert>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Final Review &amp; Launch</Typography>

            <Stack spacing={3} sx={{ mb: 4 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>JOB TITLE</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{title} ({internalJobCode || 'No internal code'})</Typography>
              </Box>

              {jobType === 'FULL_TIME' ? (
                <>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>COMPENSATION RANGE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {salaryVisibility ? `${currency} ${salaryMin} - ${salaryMax}` : `${currency} Competitive`}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CONFIGURED HIRING PIPELINE</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      {stages.map((s, idx) => (
                        <Chip key={s.id} label={`${idx + 1}. ${s.name}`} variant="outlined" color="primary" sx={{ fontWeight: 600 }} />
                      ))}
                    </Stack>
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PROJECT BUDGET</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {budgetType === 'FIXED' ? `${currency} ${budgetAmount} (Fixed)` : `${currency} ${budgetAmount} / hr`}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PROJECT DELIVERABLES</Typography>
                    <List sx={{ p: 0, mt: 1 }}>
                      {deliverables.map((item, idx) => (
                        <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                          <ListItemText primary={`• ${item}`} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AI MATCH FACTORS WEIGHTS</Typography>
                {jobType === 'FULL_TIME' ? (
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Skills</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{skillWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Experience</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{experienceWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Education</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{educationWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Domain</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{domainWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Practical</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{practicalWeight}%</Typography></Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Skills Fit</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{flSkillWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Portfolio</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{flPortfolioWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Rate Fit</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{flRateWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Track Record</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{flTrackRecordWeight}%</Typography></Grid>
                    <Grid item xs={2.4}><Typography variant="caption" sx={{ display: 'block' }}>Availability</Typography> <Typography variant="body2" sx={{ fontWeight: 700 }}>{flAvailabilityWeight}%</Typography></Grid>
                  </Grid>
                )}
              </Box>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Button variant="outlined" disabled={isSaving} onClick={() => goToStepIndex(activeStep - 1)}>Back</Button>
              <Button variant="contained" color="success" onClick={handlePublish} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />} sx={{ px: 4, fontWeight: 700 }}>
                {isSaving ? 'Publishing...' : 'Publish Job Listing'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ADD STAGE MODAL */}
      <Dialog open={showStageModal} onClose={() => { setModalError(null); setShowStageModal(false); }} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Add Stage Round</DialogTitle>
        <DialogContent>
          {modalError && (
            <Alert severity="error" sx={{ mb: 2, fontWeight: 700 }}>
              {modalError}
            </Alert>
          )}
          <Stack spacing={3} sx={{ mt: 1.5 }}>
            <TextField label="Stage Name" required value={stageName} onChange={(e) => setStageName(e.target.value)} fullWidth />
            
            <TextField
              select
              label="Evaluation Type"
              value={stageType}
              onChange={(e) => {
                const val = e.target.value as 'OA' | 'INTERVIEW' | 'CUSTOM';
                setStageType(val);
                if (val === 'INTERVIEW') {
                  setEmailTitle('Invitation: Bivio Technical Interview');
                  setEmailBody('Hi {{candidateName}},\n\nYou have progressed to the Technical Interview stage for {{jobTitle}} at {{companyName}}.\n\nWe will reach out shortly to schedule the date and time, and we will send you the specific meeting link and calendar details once booked.\n\nBest regards,\nThe Hiring Team');
                  setStageLink('');
                } else if (val === 'OA') {
                  setEmailTitle('Invite for coding round');
                  setEmailBody('Hi {{candidateName}},\n\nYou have been invited to the Coding Round for {{jobTitle}} at {{companyName}}.\n\nPlease join and complete the test via the link: {{link}}.\n\nBest regards,\nThe Hiring Team');
                  setStageLink('');
                } else {
                  setEmailTitle('');
                  setEmailBody('');
                  setStageLink('');
                }
              }}
              fullWidth
            >
              <MenuItem value="CUSTOM">Custom Evaluation</MenuItem>
              <MenuItem value="OA">Online Assessment (OA)</MenuItem>
              <MenuItem value="INTERVIEW">Interactive Interview</MenuItem>
            </TextField>

            {stageType === 'OA' && (
              <TextField
                label="Assessment URL Link"
                required
                value={stageLink}
                onChange={(e) => setStageLink(e.target.value)}
                fullWidth
              />
            )}

            {(stageType === 'OA' || stageType === 'INTERVIEW') && (
              <>
                <TextField label="Email Invitation Title" required value={emailTitle} onChange={(e) => setEmailTitle(e.target.value)} fullWidth />
                <TextField
                  label="Email Invitation Body"
                  multiline
                  rows={3}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  fullWidth
                  placeholder={
                    stageType === 'INTERVIEW'
                      ? "Use templates: {{candidateName}}, {{jobTitle}}, {{companyName}}"
                      : "Use templates: {{candidateName}}, {{jobTitle}}, {{companyName}}, {{link}}"
                  }
                />
                <TextField
                  label="Prerequisite Instructions"
                  multiline
                  rows={2}
                  value={prerequisite}
                  onChange={(e) => setPrerequisite(e.target.value)}
                  fullWidth
                  placeholder="Instructions candidate sees before starting (e.g. stable internet connection)"
                />
                <TextField
                  label="Requirement Reference Document Name"
                  value={reqDocFileName}
                  onChange={(e) => setReqDocFileName(e.target.value)}
                  fullWidth
                  placeholder="e.g. topic_guidelines.pdf"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachFileIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setModalError(null); setShowStageModal(false); }}>Cancel</Button>
          <Button variant="contained" onClick={addStage} sx={{ fontWeight: 700 }}>Add Stage</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// useSearchParams() requires a Suspense boundary for static prerendering in
// the App Router — this wrapper is the standard Next.js fix, not a
// restructure of the wizard's actual logic.
export default function NewJobWizard() {
  return (
    <Suspense fallback={null}>
      <NewJobWizardInner />
    </Suspense>
  );
}
