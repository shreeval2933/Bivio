'use client';

import React, { useState, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Avatar,
  Divider,
  LinearProgress,
  MenuItem,
  IconButton,
  Rating,
  List,
  ListItemButton,
  ListItemText,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { showNotification } from '@/store/slices/notificationSlice';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import {
  useGetCandidateProfileQuery,
  useUpdateCandidateProfileMutation,
  useSaveCandidateSkillsMutation,
  useSaveWorkExperienceMutation,
  useSaveEducationMutation,
  useSaveCertificationsMutation,
  useSaveLanguagesMutation,
  useSavePortfolioMutation,
  useUploadResumeMutation,
  useUploadResumeFileMutation,
  useSetPrimaryResumeMutation,
  useGetSkillsQuery,
} from '@/store/api/profilesApi';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

// Interfaces
interface SkillItem {
  id: string;
  name: string;
  proficiency: number;
  years: number;
}

interface WorkItem {
  id: string;
  company: string;
  title: string;
  type: 'Full-time' | 'Contract' | 'Internship' | 'Freelance';
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade?: string;
}

interface CertificationItem {
  id: string;
  name: string;
  org: string;
  issueDate: string;
  expiryDate?: string;
  url?: string;
}

interface ResumeVersion {
  id: string;
  name: string;
  uploadedAt: string;
  isPrimary: boolean;
}

interface LanguageItem {
  id: string;
  language: string;
  fluency: 'Basic' | 'Conversational' | 'Fluent' | 'Native';
}

export default function EditProfilePage() {
  const dispatch = useDispatch();

  React.useEffect(() => {
    document.title = "My Profile — Bivio";
  }, []);

  // --- API HOOKS ---
  const { data: profile, isLoading: isProfileLoading } = useGetCandidateProfileQuery();
  const [updateCandidateProfile, { isLoading: isUpdatingProfile }] = useUpdateCandidateProfileMutation();
  const [saveCandidateSkills, { isLoading: isSavingSkills }] = useSaveCandidateSkillsMutation();
  const [saveWorkExperience, { isLoading: isSavingWork }] = useSaveWorkExperienceMutation();
  const [saveEducation, { isLoading: isSavingEdu }] = useSaveEducationMutation();
  const [saveCertifications, { isLoading: isSavingCerts }] = useSaveCertificationsMutation();
  const [saveLanguages, { isLoading: isSavingLangs }] = useSaveLanguagesMutation();
  const [savePortfolio, { isLoading: isSavingPortfolio }] = useSavePortfolioMutation();
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();
  const [uploadResumeFile, { isLoading: isUploadingFile }] = useUploadResumeFileMutation();
  const [setPrimaryResume, { isLoading: isSettingPrimaryResume }] = useSetPrimaryResumeMutation();

  const isSaving = isUpdatingProfile || isSavingSkills || isSavingWork || isSavingEdu || isSavingCerts || isSavingLangs || isUploadingResume || isUploadingFile || isSettingPrimaryResume || isSavingPortfolio;

  // --- STATE MANAGEMENT ---
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [openFullTime, setOpenFullTime] = useState(false);
  const [openFreelance, setOpenFreelance] = useState(false);
  const [profileImage, setProfileImage] = useState('');

  const [about, setAbout] = useState('');
  const [experience, setExperience] = useState('0');
  const [status, setStatus] = useState('Open to work');
  const [noticePeriod, setNoticePeriod] = useState('Immediate');

  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillNameInput, setSkillNameInput] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [skillProfInput, setSkillProfInput] = useState<number>(3);
  const [skillYearsInput, setSkillYearsInput] = useState<number>(1);
  const [skillSearch, setSkillSearch] = useState('');

  const [workHistory, setWorkHistory] = useState<WorkItem[]>([]);
  const [educationList, setEducationList] = useState<EducationItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [links, setLinks] = useState({
    linkedin: '',
    github: '',
    website: '',
    twitter: '',
  });
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  // Skills lookup
  const { data: skillsSuggestions, isLoading: isSkillsLoading } = useGetSkillsQuery(skillSearch, {
    skip: skillSearch.length < 2,
  });

  // Sync profile data to state
  React.useEffect(() => {
    if (profile && !isSaving) {
      setName(profile.user?.fullName || '');
      setHeadline(profile.headline || '');
      setLocation(profile.location || '');
      setEmail(profile.user?.email || '');
      setPhone(profile.user?.phone || '');
      setProfileImage(profile.user?.profileImage || '');
      setOpenFullTime(profile.openToFullTime || false);
      setOpenFreelance(profile.openToFreelance || false);
      setAbout(profile.summary || '');
      setExperience(profile.experienceYears?.toString() || '0');
      
      const statusMap: Record<string, string> = {
        EMPLOYED: 'Employed',
        FREELANCING: 'Freelancing',
        OPEN_TO_WORK: 'Open to work',
        STUDENT: 'Student'
      };
      setStatus(statusMap[profile.currentStatus || ''] || 'Open to work');

      const noticeMap: Record<string, string> = {
        IMMEDIATE: 'Immediate',
        DAYS_15: '15 days',
        DAYS_30: '30 days',
        DAYS_60: '60 days',
        DAYS_90: '90 days',
        ANY: 'Immediate'
      };
      setNoticePeriod(noticeMap[profile.noticePeriod || ''] || 'Immediate');

      if (profile.skills) {
        setSkills(profile.skills.map((s: any) => ({
          id: s.skillId,
          name: s.skill?.name || '',
          proficiency: s.proficiency || 3,
          years: s.yearsOfExperience ? Number(s.yearsOfExperience) : 1
        })));
      }

      if (profile.workExperience) {
        setWorkHistory(profile.workExperience.map((w: any) => ({
          id: w.id,
          company: w.company,
          title: w.title,
          type: w.employmentType === 'FULL_TIME' ? 'Full-time' :
                w.employmentType === 'CONTRACT' ? 'Contract' :
                w.employmentType === 'INTERNSHIP' ? 'Internship' : 'Freelance',
          startDate: w.startDate ? w.startDate.substring(0, 7) : '',
          endDate: w.endDate ? w.endDate.substring(0, 7) : '',
          current: w.isCurrent,
          description: w.description || ''
        })));
      }

      if (profile.education) {
        setEducationList(profile.education.map((e: any) => ({
          id: e.id,
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          startYear: e.startYear?.toString() || '',
          endYear: e.endYear?.toString() || '',
          grade: e.grade || ''
        })));
      }

      if (profile.certifications) {
        setCertifications(profile.certifications.map((c: any) => ({
          id: c.id,
          name: c.name,
          org: c.issuingOrg,
          issueDate: c.issueDate ? c.issueDate.substring(0, 10) : '',
          expiryDate: c.expiryDate ? c.expiryDate.substring(0, 10) : undefined,
          url: c.credentialUrl || ''
        })));
      }

      if (profile.resumes) {
        setResumes(profile.resumes.map((r: any) => ({
          id: r.id,
          name: r.fileName,
          uploadedAt: r.uploadedAt ? r.uploadedAt.substring(0, 10) : '',
          isPrimary: r.isPrimary
        })));
      }

      if (profile.languages) {
        setLanguages(profile.languages.map((l: any) => ({
          id: l.id,
          language: l.language,
          fluency: l.fluency === 'BASIC' ? 'Basic' :
                   l.fluency === 'CONVERSATIONAL' ? 'Conversational' :
                   l.fluency === 'FLUENT' ? 'Fluent' : 'Native'
        })));
      }

      if (profile.portfolio) {
        setLinks({
          linkedin: profile.portfolio.linkedinUrl || '',
          github: profile.portfolio.githubUrl || '',
          website: profile.portfolio.portfolioUrl || '',
          twitter: '',
        });
      }
    }
  }, [profile, isSaving]);

  // --- DYNAMIC HELPERS ---
  const completionPercentage = useMemo(() => {
    let score = 0;
    let totalPoints = 12;

    if (name) score++;
    if (headline) score++;
    if (location) score++;
    if (email) score++;
    if (phone) score++;
    if (about) score++;
    if (experience) score++;
    if (skills.length > 0) score++;
    if (workHistory.length > 0) score++;
    if (educationList.length > 0) score++;
    if (resumes.length > 0) score++;
    if (links.linkedin || links.github) score++;

    return Math.round((score / totalPoints) * 100);
  }, [name, headline, location, email, phone, about, experience, skills, workHistory, educationList, resumes, links]);

  // Add new skill
  const handleAddSkill = () => {
    if (!selectedSkillId || !skillNameInput) {
      dispatch(showNotification({ message: 'Please select a skill from the suggestions.', severity: 'warning' }));
      return;
    }
    if (skills.some(s => s.id === selectedSkillId)) {
      dispatch(showNotification({ message: 'Skill already added.', severity: 'warning' }));
      return;
    }

    setSkills([
      ...skills,
      {
        id: selectedSkillId,
        name: skillNameInput,
        proficiency: skillProfInput,
        years: skillYearsInput,
      },
    ]);
    setSkillNameInput('');
    setSelectedSkillId(null);
    setSkillProfInput(3);
    setSkillYearsInput(1);
    setSkillSearch('');
  };

  // Add empty work row
  const handleAddWork = () => {
    const newWork: WorkItem = {
      id: `new-${Date.now()}`,
      company: '',
      title: '',
      type: 'Full-time',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    };
    setWorkHistory([...workHistory, newWork]);
  };

  // Update work history field
  const handleUpdateWork = (id: string, field: keyof WorkItem, value: any) => {
    setWorkHistory(
      workHistory.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'current' && value === true) {
            updated.endDate = '';
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Delete work row
  const handleDeleteWork = (id: string) => {
    setWorkHistory(workHistory.filter((item) => item.id !== id));
  };

  // Add empty education row
  const handleAddEducation = () => {
    const newEdu: EducationItem = {
      id: `new-${Date.now()}`,
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startYear: '',
      endYear: '',
    };
    setEducationList([...educationList, newEdu]);
  };

  // Update education field
  const handleUpdateEducation = (id: string, field: keyof EducationItem, value: string) => {
    setEducationList(
      educationList.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Delete education row
  const handleDeleteEducation = (id: string) => {
    setEducationList(educationList.filter((item) => item.id !== id));
  };

  // Add empty certification row
  const handleAddCert = () => {
    setCertifications([
      ...certifications,
      { id: `new-${Date.now()}`, name: '', org: '', issueDate: '' },
    ]);
  };

  const handleUpdateCert = (id: string, field: keyof CertificationItem, value: string) => {
    setCertifications(
      certifications.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Delete certification row
  const handleDeleteCert = (id: string) => {
    setCertifications(certifications.filter((item) => item.id !== id));
  };

  // Add empty language row
  const handleAddLang = () => {
    setLanguages([...languages, { id: `new-${Date.now()}`, language: '', fluency: 'Fluent' }]);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (resumes.length >= 5) {
      dispatch(showNotification({ message: 'Maximum 5 resumes allowed.', severity: 'warning' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const { fileUrl } = await uploadResumeFile({ fileName: file.name, base64Data }).unwrap();
        await uploadResume({
          fileUrl,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          sizeBytes: file.size,
        }).unwrap();
        dispatch(showNotification({ message: 'Resume uploaded and registered successfully!', severity: 'success' }));
      } catch (err: any) {
        dispatch(showNotification({
          message: err.data?.message || 'Failed to upload resume.',
          severity: 'error'
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetPrimaryResume = async (id: string) => {
    try {
      await setPrimaryResume(id).unwrap();
      dispatch(showNotification({ message: 'Primary resume updated!', severity: 'success' }));
    } catch (err: any) {
      dispatch(showNotification({
        message: err.data?.message || 'Failed to update primary resume.',
        severity: 'error'
      }));
    }
  };

  // Save changes handler with robust validation
  const handleSave = async () => {
    // 1. Validate Identity
    if (!name.trim()) {
      dispatch(showNotification({ message: 'Full name is required.', severity: 'error' }));
      return;
    }
    if (!location.trim()) {
      dispatch(showNotification({ message: 'Location is required.', severity: 'error' }));
      return;
    }
    if (!headline.trim()) {
      dispatch(showNotification({ message: 'Headline is required.', severity: 'error' }));
      return;
    }

    // 2. Validate Work Experience
    for (const w of workHistory) {
      if (!w.company.trim() || !w.title.trim()) {
        dispatch(showNotification({ message: 'Work experience entries must have a company and title.', severity: 'error' }));
        return;
      }
      if (!w.startDate) {
        dispatch(showNotification({ message: 'Start date is required for all work experience entries.', severity: 'error' }));
        return;
      }
      if (!w.current && !w.endDate) {
        dispatch(showNotification({ message: 'End date is required for past work experience entries.', severity: 'error' }));
        return;
      }
      if (!w.current && w.endDate && new Date(w.startDate) > new Date(w.endDate)) {
        dispatch(showNotification({ message: 'End date must be after start date.', severity: 'error' }));
        return;
      }
    }

    // 3. Validate Education
    for (const edu of educationList) {
      if (!edu.institution.trim() || !edu.degree.trim() || !edu.fieldOfStudy.trim()) {
        dispatch(showNotification({ message: 'Education entries must include institution, degree, and field of study.', severity: 'error' }));
        return;
      }
      const start = Number(edu.startYear);
      const end = Number(edu.endYear);
      if (isNaN(start) || isNaN(end) || start < 1950 || end < 1950) {
        dispatch(showNotification({ message: 'Please enter valid years for education.', severity: 'error' }));
        return;
      }
      if (start > end) {
        dispatch(showNotification({ message: 'Start year must be less than or equal to end year.', severity: 'error' }));
        return;
      }
    }

    // 4. Validate Certifications
    for (const c of certifications) {
      if (!c.name.trim() || !c.org.trim()) {
        dispatch(showNotification({ message: 'Certifications must include a name and organization.', severity: 'error' }));
        return;
      }
      if (!c.issueDate) {
        dispatch(showNotification({ message: 'Issue date is required for all certifications.', severity: 'error' }));
        return;
      }
      if (c.expiryDate && new Date(c.issueDate) > new Date(c.expiryDate)) {
        dispatch(showNotification({ message: 'Certification expiry date must be after issue date.', severity: 'error' }));
        return;
      }
      if (c.url && c.url.trim() !== '') {
        try {
          new URL(c.url.trim());
        } catch (_) {
          dispatch(showNotification({ message: 'Please enter a valid credential URL (e.g., https://example.com) for certifications.', severity: 'error' }));
          return;
        }
      }
    }

    // 5. Validate Languages
    const langNames = languages.map(l => l.language.trim().toLowerCase()).filter(Boolean);
    if (new Set(langNames).size !== langNames.length) {
      dispatch(showNotification({ message: 'Each language can only be listed once.', severity: 'error' }));
      return;
    }
    for (const l of languages) {
      if (!l.language.trim()) {
        dispatch(showNotification({ message: 'Language name cannot be empty.', severity: 'error' }));
        return;
      }
    }

    try {
      // Core Profile Update
      const statusMap: Record<string, string> = {
        'Employed': 'EMPLOYED',
        'Freelancing': 'FREELANCING',
        'Open to work': 'OPEN_TO_WORK',
        'Student': 'STUDENT'
      };
      const noticeMap: Record<string, string> = {
        'Immediate': 'IMMEDIATE',
        '15 days': 'DAYS_15',
        '30 days': 'DAYS_30',
        '60 days': 'DAYS_60',
        '90 days': 'DAYS_90'
      };
      const employmentTypeMap: Record<string, string> = {
        'Full-time': 'FULL_TIME',
        'Contract': 'CONTRACT',
        'Internship': 'INTERNSHIP',
        'Freelance': 'FREELANCE'
      };
      const fluencyMap: Record<string, string> = {
        'Basic': 'BASIC',
        'Conversational': 'CONVERSATIONAL',
        'Fluent': 'FLUENT',
        'Native': 'NATIVE'
      };

      await Promise.all([
        updateCandidateProfile({
          fullName: name,
          phone: phone || undefined,
          profileImage: profileImage || undefined,
          headline,
          summary: about,
          location,
          experienceYears: Number(experience),
          currentStatus: statusMap[status],
          noticePeriod: noticeMap[noticePeriod],
          openToFullTime: openFullTime,
          openToFreelance: openFreelance,
        }).unwrap(),

        saveCandidateSkills({
          skills: skills.map(s => ({
            skillId: s.id,
            proficiency: s.proficiency,
            yearsOfExperience: s.years
          }))
        }).unwrap(),

        saveWorkExperience({
          entries: workHistory.map(w => ({
            company: w.company,
            title: w.title,
            employmentType: employmentTypeMap[w.type] || 'FULL_TIME',
            startDate: new Date(w.startDate + '-02').toISOString(),
            endDate: w.endDate ? new Date(w.endDate + '-02').toISOString() : undefined,
            isCurrent: w.current,
            description: w.description
          }))
        }).unwrap(),

        saveEducation({
          entries: educationList.map(e => ({
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            startYear: Number(e.startYear),
            endYear: Number(e.endYear),
            grade: e.grade || undefined
          }))
        }).unwrap(),

        saveCertifications({
          entries: certifications.map(c => ({
            name: c.name,
            issuingOrg: c.org,
            issueDate: new Date(c.issueDate).toISOString(),
            expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString() : undefined,
            credentialUrl: c.url || undefined
          }))
        }).unwrap(),

        saveLanguages({
          entries: languages.map(l => ({
            language: l.language,
            fluency: fluencyMap[l.fluency] || 'FLUENT'
          }))
        }).unwrap(),

        savePortfolio({
          portfolioUrl: links.website || undefined,
          githubUrl: links.github || undefined,
          linkedinUrl: links.linkedin || undefined,
        }).unwrap()
      ]);

      dispatch(
        showNotification({
          message: 'All changes saved successfully! Profile is up to date.',
          severity: 'success',
        })
      );
    } catch (err: any) {
      dispatch(
        showNotification({
          message: err.data?.message || 'Error occurred while saving profile.',
          severity: 'error',
        })
      );
    }
  };

  if (isProfileLoading) {
    return <FullPageLoader message="Loading your profile data..." />;
  }



  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 850, mb: 1, fontFamily: 'Outfit, sans-serif', color: 'text.primary' }}>
          My Profile &amp; Resume
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal details, work experience, education, skills, and resume attachments.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: Sticky Rail + Completion Meter */}
        <Grid item xs={12} md={3.5}>
          <Box sx={{ position: 'sticky', top: 90 }}>
            {/* Completion Meter Card */}
            <Card
              sx={{
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
                borderRadius: 4,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                  Profile Completion
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                    {completionPercentage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {completionPercentage < 100 ? 'Fill more fields to stand out' : 'Profile fully complete!'}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={completionPercentage}
                  color={completionPercentage > 75 ? 'success' : 'primary'}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <InfoIcon fontSize="inherit" /> Complete profiles are 4x more likely to get shortlisted.
                </Typography>
              </CardContent>
            </Card>

            {/* Quick Links Progress Rail */}
            <Card sx={{ border: '1px solid #f1f5f9', borderRadius: 4, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 700, color: 'text.secondary' }}>
                  Profile Sections
                </Typography>
                <List component="nav" dense>
                  {[
                    { label: 'Identity & Contact', target: '#identity', complete: !!(name && headline && location) },
                    { label: 'Career Summary', target: '#career', complete: !!(about && experience) },
                    { label: 'Skills & Tech', target: '#skills', complete: skills.length > 0 },
                    { label: 'Work Experience', target: '#experience', complete: workHistory.length > 0 },
                    { label: 'Education Details', target: '#education', complete: educationList.length > 0 },
                    { label: 'Certifications', target: '#certifications', complete: certifications.length > 0, optional: true },
                    { label: 'Resumes & Attachments', target: '#resume', complete: resumes.length > 0 },
                    { label: 'Social & Links', target: '#links', complete: !!(links.linkedin || links.github) },
                    { label: 'Languages', target: '#languages', complete: languages.length > 0, optional: true },
                  ].map((sec) => (
                    <ListItemButton
                      key={sec.target}
                      onClick={() => {
                        const el = document.querySelector(sec.target);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      sx={{
                        borderRadius: 2.5,
                        my: 0.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid transparent',
                        '&:hover': {
                          bgcolor: 'rgba(37, 99, 235, 0.04)',
                          borderColor: 'rgba(37, 99, 235, 0.08)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={sec.label}
                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary' }}
                      />
                      {sec.complete ? (
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', ml: 1 }} />
                      ) : (
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: sec.optional ? 'text.disabled' : 'warning.main',
                            ml: 1.5,
                            mr: 0.5,
                          }}
                        />
                      )}
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* RIGHT COLUMN: Scrollable Forms */}
        <Grid item xs={12} md={8.5}>
          <Stack spacing={4} sx={{ pb: 8 }}>
            
            {/* SECTION 1: IDENTITY & CONTACT */}
            <Card id="identity" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  Section 1 — Identity & Contact
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  This information forms your header and sets your portal openness status.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {/* Photo Uploader */}
                  <Grid item xs={12} sm={3}>
                    <Stack spacing={1} alignItems="center">
                       <Avatar
                        src={profileImage || undefined}
                        sx={{ width: 88, height: 88, bgcolor: 'primary.light', fontSize: '2rem', fontWeight: 800 }}
                      >
                        {name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AM'}
                      </Avatar>
                      <Button variant="outlined" size="small" component="label" startIcon={<CloudUploadIcon />}>
                        Upload
                        <input
                          type="file"
                          hidden
                          accept="image/png, image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfileImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </Button>
                      <Typography variant="caption" color="text.secondary" align="center">
                        Max 5MB (PNG/JPG)
                      </Typography>
                    </Stack>
                  </Grid>

                  {/* Input fields */}
                  <Grid item xs={12} sm={9}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12}>
                        <TextField
                          label="Full name"
                          required
                          fullWidth
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Headline"
                          required
                          fullWidth
                          inputProps={{ maxLength: 120 }}
                          helperText={`${120 - headline.length} characters left`}
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Email"
                          type="email"
                          required
                          disabled
                          fullWidth
                          value={email}
                          helperText="Verified Registration Email"
                          InputProps={{
                            endAdornment: <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Phone (Optional)"
                          fullWidth
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Location"
                          required
                          placeholder="City, Country"
                          fullWidth
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        {/* Openness Toggles */}
                        <Box
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: 'background.default',
                            border: '1px solid #f1f5f9',
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                            Portal Availability (Openness)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Control whether you appear in full-time recruitment shortlist tables, freelance bidder lists, or both.
                          </Typography>
                          <Stack spacing={1}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={openFullTime}
                                  onChange={(e) => setOpenFullTime(e.target.checked)}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Open to full-time career roles
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={openFreelance}
                                  onChange={(e) => setOpenFreelance(e.target.checked)}
                                  color="secondary"
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Open to freelance/contract milestone projects
                                </Typography>
                              }
                            />
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* SECTION 2: CAREER SUMMARY */}
            <Card id="career" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  Section 2 — Career Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Provide details about your total experience, notice terms, and a short summary.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      label="About / Summary"
                      multiline
                      rows={5}
                      fullWidth
                      inputProps={{ maxLength: 2000 }}
                      helperText={`${2000 - about.length} characters left`}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Total experience (Years)"
                      type="number"
                      placeholder="e.g. 6.5"
                      fullWidth
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Current status"
                      fullWidth
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {['Employed', 'Freelancing', 'Open to work', 'Student'].map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Notice period (Full-time)"
                      fullWidth
                      value={noticePeriod}
                      onChange={(e) => setNoticePeriod(e.target.value)}
                    >
                      {['Immediate', '15 days', '30 days', '60 days', '90 days'].map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* SECTION 3: SKILLS */}
            <Card id="skills" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Outfit, sans-serif' }}>
                  Section 3 — Structured Credentials
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Structured inputs used directly to match your credentials with open positions.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {/* Skills Section */}
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Key Skills & proficiency
                </Typography>

                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid #f1f5f9',
                    bgcolor: 'background.default',
                    mb: 3,
                  }}
                >
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={skillsSuggestions || []}
                        getOptionLabel={(option) => option.name}
                        inputValue={skillSearch}
                        onInputChange={(_, val) => setSkillSearch(val)}
                        onChange={(_, val) => {
                          if (val) {
                            setSkillNameInput(val.name);
                            setSelectedSkillId(val.id);
                          } else {
                            setSkillNameInput('');
                            setSelectedSkillId(null);
                          }
                        }}
                        loading={isSkillsLoading}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Skill name"
                            placeholder="Type to search (e.g. React)"
                            size="small"
                            fullWidth
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {isSkillsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Proficiency: {skillProfInput} / 5
                      </Typography>
                      <Rating
                        value={skillProfInput}
                        onChange={(_e, val) => setSkillProfInput(val || 3)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Years of Experience"
                        type="number"
                        size="small"
                        fullWidth
                        value={skillYearsInput}
                        onChange={(e) => setSkillYearsInput(Number(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Button variant="contained" fullWidth onClick={handleAddSkill} startIcon={<AddIcon />}>
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {skills.map((s, idx) => (
                    <Chip
                      key={s.id}
                      label={`${s.name} (Lvl ${s.proficiency} · ${s.years} yrs)`}
                      onDelete={() => setSkills(skills.filter((_, i) => i !== idx))}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* WORK EXPERIENCE */}
            <Card id="experience" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Work Experience
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={handleAddWork} size="small" variant="outlined">
                    Add Experience
                  </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {workHistory.map((w) => (
                    <Box
                      key={w.id}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Experience Entry
                        </Typography>
                        <Button
                          onClick={() => handleDeleteWork(w.id)}
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                          <TextField
                            label="Company Name"
                            size="small"
                            fullWidth
                            value={w.company}
                            onChange={(e) => handleUpdateWork(w.id, 'company', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Role Title"
                            size="small"
                            fullWidth
                            value={w.title}
                            onChange={(e) => handleUpdateWork(w.id, 'title', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            label="Employment Type"
                            size="small"
                            fullWidth
                            value={w.type}
                            onChange={(e) => handleUpdateWork(w.id, 'type', e.target.value)}
                          >
                            {['Full-time', 'Contract', 'Internship', 'Freelance'].map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Start Date"
                            type="month"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={w.startDate}
                            onChange={(e) => handleUpdateWork(w.id, 'startDate', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="End Date"
                            type="month"
                            size="small"
                            fullWidth
                            disabled={w.current}
                            InputLabelProps={{ shrink: true }}
                            value={w.endDate || ''}
                            onChange={(e) => handleUpdateWork(w.id, 'endDate', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={w.current}
                                onChange={(e) => handleUpdateWork(w.id, 'current', e.target.checked)}
                              />
                            }
                            label="I currently work here"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            multiline
                            rows={3}
                            fullWidth
                            inputProps={{ maxLength: 500 }}
                            helperText={`${500 - w.description.length} characters left`}
                            value={w.description}
                            onChange={(e) => handleUpdateWork(w.id, 'description', e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* EDUCATION */}
            <Card id="education" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Education
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={handleAddEducation} size="small" variant="outlined">
                    Add Education
                  </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {educationList.map((edu) => (
                    <Box
                      key={edu.id}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Education Entry
                        </Typography>
                        <Button
                          onClick={() => handleDeleteEducation(edu.id)}
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                          <TextField
                            label="Institution / University"
                            size="small"
                            fullWidth
                            value={edu.institution}
                            onChange={(e) => handleUpdateEducation(edu.id, 'institution', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Degree Title"
                            placeholder="e.g. Bachelor of Technology"
                            size="small"
                            fullWidth
                            value={edu.degree}
                            onChange={(e) => handleUpdateEducation(edu.id, 'degree', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Field of study"
                            placeholder="e.g. Computer Science"
                            size="small"
                            fullWidth
                            value={edu.fieldOfStudy}
                            onChange={(e) => handleUpdateEducation(edu.id, 'fieldOfStudy', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Start Year"
                            placeholder="e.g. 2016"
                            size="small"
                            fullWidth
                            value={edu.startYear}
                            onChange={(e) => handleUpdateEducation(edu.id, 'startYear', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="End Year"
                            placeholder="e.g. 2020"
                            size="small"
                            fullWidth
                            value={edu.endYear}
                            onChange={(e) => handleUpdateEducation(edu.id, 'endYear', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Grade (Optional)"
                            placeholder="e.g. 8.0 CGPA / 85%"
                            size="small"
                            fullWidth
                            value={edu.grade || ''}
                            onChange={(e) => handleUpdateEducation(edu.id, 'grade', e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* CERTIFICATIONS */}
            <Card id="certifications" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Certifications (Optional)
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={handleAddCert} size="small" variant="outlined">
                    Add Cert
                  </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={3}>
                  {certifications.map((c) => (
                    <Box
                      key={c.id}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Certification Entry
                        </Typography>
                        <Button
                          onClick={() => handleDeleteCert(c.id)}
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Remove
                        </Button>
                      </Stack>

                      <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                          <TextField
                            label="Certification Name"
                            size="small"
                            fullWidth
                            value={c.name}
                            onChange={(e) => handleUpdateCert(c.id, 'name', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Issuing Organization"
                            size="small"
                            fullWidth
                            value={c.org}
                            onChange={(e) => handleUpdateCert(c.id, 'org', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Credential URL"
                            size="small"
                            fullWidth
                            value={c.url || ''}
                            onChange={(e) => handleUpdateCert(c.id, 'url', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Issue date"
                            type="date"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={c.issueDate}
                            onChange={(e) => handleUpdateCert(c.id, 'issueDate', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Expiry date"
                            type="date"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={c.expiryDate || ''}
                            onChange={(e) => handleUpdateCert(c.id, 'expiryDate', e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                  {certifications.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No certifications listed yet.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* RESUMES */}
            <Card id="resume" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Resumes
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: resumes.length >= 5 ? 'error.main' : 'primary.main' }}>
                    {resumes.length} / 5 Uploaded
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  PDF format only, under 5MB. Up to 5 versions retained.
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={resumes.length >= 5}
                  sx={{ mb: 3 }}
                >
                  {resumes.length >= 5 ? 'Upload Limit Reached (Max 5)' : 'Upload New Resume Version'}
                  <input type="file" hidden accept="application/pdf" onChange={handleResumeUpload} disabled={resumes.length >= 5} />
                </Button>

                <Stack spacing={2}>
                  {resumes.map((r) => (
                    <Box
                      key={r.id}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: '1.5px solid',
                        borderColor: r.isPrimary ? 'primary.light' : 'divider',
                        bgcolor: r.isPrimary ? 'rgba(37, 99, 235, 0.02)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {r.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Uploaded on {r.uploadedAt}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant={r.isPrimary ? 'contained' : 'outlined'}
                          disabled={r.isPrimary}
                          onClick={() => handleSetPrimaryResume(r.id)}
                        >
                          {r.isPrimary ? 'Primary Resume' : 'Mark Primary'}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* LINKS */}
            <Card id="links" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Links & Profiles
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="LinkedIn URL"
                      placeholder="https://linkedin.com/in/username"
                      fullWidth
                      value={links.linkedin}
                      onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="GitHub URL"
                      placeholder="https://github.com/username"
                      fullWidth
                      value={links.github}
                      onChange={(e) => setLinks({ ...links, github: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Personal Website"
                      placeholder="https://mywebsite.com"
                      fullWidth
                      value={links.website}
                      onChange={(e) => setLinks({ ...links, website: e.target.value })}
                    />
                  </Grid>
                  {/* <Grid item xs={12} sm={6}>
                    <TextField
                      label="X / Twitter"
                      placeholder="https://x.com/username"
                      fullWidth
                      value={links.twitter}
                      onChange={(e) => setLinks({ ...links, twitter: e.target.value })}
                    />
                  </Grid> */}
                </Grid>
              </CardContent>
            </Card>

            {/* LANGUAGES */}
            <Card id="languages" sx={{ scrollMarginTop: '100px' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Languages
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={handleAddLang} size="small" variant="outlined">
                    Add Language
                  </Button>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={2}>
                  {languages.map((l) => (
                    <Box key={l.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        label="Language"
                        size="small"
                        value={l.language}
                        onChange={(e) =>
                          setLanguages(
                            languages.map((x) => (x.id === l.id ? { ...x, language: e.target.value } : x))
                          )
                        }
                        sx={{ flexGrow: 1 }}
                      />
                      <TextField
                        select
                        label="Fluency"
                        size="small"
                        value={l.fluency}
                        onChange={(e) =>
                          setLanguages(
                            languages.map((x) => (x.id === l.id ? { ...x, fluency: e.target.value as any } : x))
                          )
                        }
                        sx={{ width: 180 }}
                      >
                        {['Basic', 'Conversational', 'Fluent', 'Native'].map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                      <IconButton onClick={() => setLanguages(languages.filter((x) => x.id !== l.id))} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* SAVE BUTTON BAR */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={isSaving}
                sx={{
                  px: 6,
                  py: 1.75,
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)',
                }}
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </Box>

          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
