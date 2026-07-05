import { ChangeEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface StudentOption {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

interface StudentProfile {
  id: string;
  studentCode: string | null;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  dateOfBirth: string;
  className: string | null;
  gradeLevel: string | null;
  stream: string | null;
  profilePhotoUrl: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentRelationship: string | null;
  enrolledAt: string;
}

interface PortalSummary {
  attendanceEntries: number;
  reportCards: number;
  feeStatements: number;
  timetable: number;
  announcements: number;
}

interface ReportCard {
  id: string;
  marks: number;
  grade: string;
  gpaPoints: number;
  student: {
    admissionNo: string;
    firstName: string;
    lastName: string;
  };
  exam: {
    title: string;
    examDate: string;
    subject: {
      code: string;
      name: string;
    };
  };
}

interface FeeStatement {
  id: string;
  invoiceNo: string;
  totalAmount: string;
  outstandingAmount: string;
  status: string;
  dueDate: string;
}

interface PopUploadResponse {
  id: string;
  message: string;
  status: string;
}

interface PortalMessage {
  id: string;
  title: string;
  message: string;
  audience: string;
  sentAt: string;
}

interface PortalAssignment {
  id: string;
  title: string;
  currentStep: string;
  status: string;
  createdAt: string;
}

export function PortalPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [feeStatements, setFeeStatements] = useState<FeeStatement[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [publishingAssignment, setPublishingAssignment] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [messageVisibleCount, setMessageVisibleCount] = useState(5);
  const [assignmentVisibleCount, setAssignmentVisibleCount] = useState(5);
  const [showPopDialog, setShowPopDialog] = useState(false);
  const [selectedInvoiceForPop, setSelectedInvoiceForPop] = useState<FeeStatement | null>(null);
  const [popNotes, setPopNotes] = useState("");
  const [popFileName, setPopFileName] = useState("");
  const [popFileType, setPopFileType] = useState("");
  const [popFileData, setPopFileData] = useState("");
  const [popStatus, setPopStatus] = useState("");
  const [uploadingPop, setUploadingPop] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [uploadingProfilePhotoFor, setUploadingProfilePhotoFor] = useState<string | null>(null);
  const [showFeeStatementApprovalDialog, setShowFeeStatementApprovalDialog] = useState(false);
  const [selectedInvoiceForApproval, setSelectedInvoiceForApproval] = useState<FeeStatement | null>(null);
  const [approvalFileName, setApprovalFileName] = useState("");
  const [approvalFileType, setApprovalFileType] = useState("");
  const [approvalFileData, setApprovalFileData] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [uploadingApproval, setUploadingApproval] = useState(false);
  const [showAssignmentSubmissionDialog, setShowAssignmentSubmissionDialog] = useState(false);
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState<PortalAssignment | null>(null);
  const [submissionFileName, setSubmissionFileName] = useState("");
  const [submissionFileType, setSubmissionFileType] = useState("");
  const [submissionFileData, setSubmissionFileData] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [uploadingSubmission, setUploadingSubmission] = useState(false);

  const canManagePortalContent = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "REGISTRAR"].includes(user?.role ?? "");

  const loadData = async (studentId?: string) => {
    const query = studentId ? `?studentId=${studentId}` : "";
    const [summaryResponse, studentsResponse, profilesResponse, reportCardsResponse, feeStatementsResponse, messagesResponse, assignmentsResponse] = await Promise.all([
      api.get<PortalSummary>("/portal/summary"),
      api.get<StudentOption[]>("/portal/students"),
      api.get<StudentProfile[]>(`/portal/student-profiles${query}`),
      api.get<ReportCard[]>(`/portal/report-cards${query}`),
      api.get<FeeStatement[]>(`/portal/fee-statements${query}`),
      api.get<PortalMessage[]>("/portal/messages"),
      api.get<PortalAssignment[]>("/portal/assignments")
    ]);

    setSummary(summaryResponse.data);
    setStudents(studentsResponse.data);
    setStudentProfiles(profilesResponse.data);
    setReportCards(reportCardsResponse.data);
    setFeeStatements(feeStatementsResponse.data);
    setMessages(messagesResponse.data);
    setAssignments(assignmentsResponse.data);

    if (!selectedStudentId && studentsResponse.data.length > 0) {
      setSelectedStudentId(studentsResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }
    loadData(selectedStudentId).catch(() => undefined);
  }, [selectedStudentId]);

  const sendMessage = async () => {
    const cleanTitle = messageTitle.trim();
    const cleanBody = messageBody.trim();

    setMessageError("");
    setMessageSuccess("");

    if (cleanTitle.length < 3) {
      setMessageError("Message title must be at least 3 characters.");
      return;
    }

    if (cleanBody.length < 10) {
      setMessageError("Message body must be at least 10 characters.");
      return;
    }

    try {
      setSendingMessage(true);
      await api.post("/portal/messages", {
        title: cleanTitle,
        message: cleanBody,
        audience: "ALL"
      });
      setMessageTitle("");
      setMessageBody("");
      setMessageSuccess("Message sent successfully.");
      await loadData(selectedStudentId || undefined);
    } catch {
      setMessageError("Unable to send message right now. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const publishAssignment = async () => {
    const cleanTitle = assignmentTitle.trim();
    const cleanDescription = assignmentDescription.trim();

    setAssignmentError("");
    setAssignmentSuccess("");

    if (cleanTitle.length < 3) {
      setAssignmentError("Assignment title must be at least 3 characters.");
      return;
    }

    if (cleanDescription.length < 10) {
      setAssignmentError("Assignment description must be at least 10 characters.");
      return;
    }

    try {
      setPublishingAssignment(true);
      await api.post("/portal/assignments", {
        title: cleanTitle,
        description: cleanDescription
      });
      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentSuccess("Assignment published successfully.");
      await loadData(selectedStudentId || undefined);
    } catch {
      setAssignmentError("Unable to publish assignment right now. Please try again.");
    } finally {
      setPublishingAssignment(false);
    }
  };

  const filteredMessages = messages.filter((item) => {
    const needle = messageSearch.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return item.title.toLowerCase().includes(needle) || item.message.toLowerCase().includes(needle);
  });

  const filteredAssignments = assignments.filter((item) => {
    const needle = assignmentSearch.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return item.title.toLowerCase().includes(needle) || item.status.toLowerCase().includes(needle);
  });

  const openPopDialog = (invoice: FeeStatement) => {
    setSelectedInvoiceForPop(invoice);
    setPopNotes("");
    setPopFileName("");
    setPopFileType("");
    setPopFileData("");
    setPopStatus("");
    setShowPopDialog(true);
  };

  const onPopFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPopFileName(file.name);
    setPopFileType(file.type || "application/octet-stream");
    const reader = new FileReader();
    reader.onload = () => {
      setPopFileData(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const uploadPop = async () => {
    if (!selectedInvoiceForPop) {
      return;
    }

    if (!popFileData || !popFileName) {
      setPopStatus("Please choose a POP file first.");
      return;
    }

    try {
      setUploadingPop(true);
      const response = await api.post<PopUploadResponse>(`/portal/fee-statements/${selectedInvoiceForPop.id}/pop`, {
        fileName: popFileName,
        fileType: popFileType,
        fileData: popFileData,
        notes: popNotes || undefined
      });
      setPopStatus(response.data.message || "Proof of payment uploaded.");
      setShowPopDialog(false);
    } catch {
      setPopStatus("Failed to upload POP. Try again.");
    } finally {
      setUploadingPop(false);
    }
  };

  const uploadStudentPhoto = async (studentId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== "image/png") {
      setProfileStatus("Only PNG student photos are allowed.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileStatus("Student photo is too large. Maximum size is 2MB.");
      return;
    }

    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read_error"));
      reader.readAsDataURL(file);
    });

    try {
      setUploadingProfilePhotoFor(studentId);
      await api.post(`/portal/students/${studentId}/photo`, {
        fileName: file.name,
        fileType: file.type,
        fileData
      });
      setProfileStatus("Student photo uploaded successfully.");
      await loadData(selectedStudentId || undefined);
    } catch {
      setProfileStatus("Unable to upload student photo.");
    } finally {
      setUploadingProfilePhotoFor(null);
      event.target.value = "";
    }
  };

  const openFeeStatementApprovalDialog = (invoice: FeeStatement) => {
    setSelectedInvoiceForApproval(invoice);
    setApprovalNotes("");
    setApprovalFileName("");
    setApprovalFileType("");
    setApprovalFileData("");
    setApprovalStatus("");
    setShowFeeStatementApprovalDialog(true);
  };

  const onApprovalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setApprovalFileName(file.name);
    setApprovalFileType(file.type || "application/octet-stream");
    const reader = new FileReader();
    reader.onload = () => {
      setApprovalFileData(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const uploadFeeStatementApproval = async () => {
    if (!selectedInvoiceForApproval) {
      return;
    }

    if (!approvalFileData || !approvalFileName) {
      setApprovalStatus("Please choose a file first.");
      return;
    }

    try {
      setUploadingApproval(true);
      const response = await api.post<PopUploadResponse>(`/portal/fee-statements/${selectedInvoiceForApproval.id}/approval-upload`, {
        fileName: approvalFileName,
        fileType: approvalFileType,
        fileData: approvalFileData,
        notes: approvalNotes || undefined
      });
      setApprovalStatus(response.data.message || "Fee statement approval uploaded.");
      setShowFeeStatementApprovalDialog(false);
      await loadData(selectedStudentId || undefined);
    } catch {
      setApprovalStatus("Failed to upload fee statement approval. Try again.");
    } finally {
      setUploadingApproval(false);
    }
  };

  const openAssignmentSubmissionDialog = (assignment: PortalAssignment) => {
    setSelectedAssignmentForSubmission(assignment);
    setSubmissionNotes("");
    setSubmissionFileName("");
    setSubmissionFileType("");
    setSubmissionFileData("");
    setSubmissionStatus("");
    setShowAssignmentSubmissionDialog(true);
  };

  const onSubmissionFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSubmissionFileName(file.name);
    setSubmissionFileType(file.type || "application/octet-stream");
    const reader = new FileReader();
    reader.onload = () => {
      setSubmissionFileData(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const uploadAssignmentSubmission = async () => {
    if (!selectedAssignmentForSubmission) {
      return;
    }

    if (!submissionFileData || !submissionFileName) {
      setSubmissionStatus("Please choose a file first.");
      return;
    }

    try {
      setUploadingSubmission(true);
      const response = await api.post<PopUploadResponse>(`/portal/assignments/${selectedAssignmentForSubmission.id}/submit`, {
        fileName: submissionFileName,
        fileType: submissionFileType,
        fileData: submissionFileData,
        notes: submissionNotes || undefined
      });
      setSubmissionStatus(response.data.message || "Assignment submitted.");
      setShowAssignmentSubmissionDialog(false);
      await loadData(selectedStudentId || undefined);
    } catch {
      setSubmissionStatus("Failed to submit assignment. Try again.");
    } finally {
      setUploadingSubmission(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Parent and Student Portal</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-5 text-sm">
        <div className="card-surface p-4">Attendance Entries: <strong>{summary?.attendanceEntries ?? 0}</strong></div>
        <div className="card-surface p-4">Report Cards: <strong>{summary?.reportCards ?? 0}</strong></div>
        <div className="card-surface p-4">Fee Statements: <strong>{summary?.feeStatements ?? 0}</strong></div>
        <div className="card-surface p-4">Timetable Entries: <strong>{summary?.timetable ?? 0}</strong></div>
        <div className="card-surface p-4">Announcements: <strong>{summary?.announcements ?? 0}</strong></div>
      </div>

      <div className="card-surface p-4">
        <label className="text-sm">Filter by student</label>
        <select
          className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:max-w-md"
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.admissionNo} - {student.firstName} {student.lastName}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Student Profile ID Cards</h3>
        {profileStatus ? <p className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-sm">{profileStatus}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {studentProfiles.map((profile) => (
            <article key={profile.id} className="card-surface relative overflow-hidden border border-[hsl(var(--border))] p-0">
              <div className="bg-brand/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">Student ID Card</div>
              <div className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  {profile.profilePhotoUrl ? (
                    <img src={profile.profilePhotoUrl} alt={`${profile.firstName} ${profile.lastName}`} className="h-20 w-20 rounded-lg border border-[hsl(var(--border))] object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--muted-foreground))]">No Photo</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-heading text-lg font-bold">{profile.firstName} {profile.lastName}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Adm No: {profile.admissionNo}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Code: {profile.studentCode ?? "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Class</p>
                    <p className="font-semibold">{profile.className ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Grade</p>
                    <p className="font-semibold">{profile.gradeLevel ?? "-"}{profile.stream ? `/${profile.stream}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Gender</p>
                    <p className="font-semibold">{profile.gender ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">DOB</p>
                    <p className="font-semibold">{new Date(profile.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-xs">
                  <p className="font-semibold">Guardian: {profile.parentName ?? "-"}</p>
                  <p>{profile.parentRelationship ?? "Parent"} • {profile.parentPhone ?? "No phone"}</p>
                </div>

                <label className="block text-xs">
                  Upload PNG Photo
                  <input
                    className="mt-1 block w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-2 py-1.5 text-xs"
                    type="file"
                    accept="image/png"
                    onChange={(event) => {
                      uploadStudentPhoto(profile.id, event).catch(() => {
                        setProfileStatus("Unable to upload student photo.");
                      });
                    }}
                    disabled={uploadingProfilePhotoFor === profile.id}
                  />
                </label>
                {uploadingProfilePhotoFor === profile.id ? <p className="text-xs text-[hsl(var(--muted-foreground))]">Uploading photo...</p> : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <h3 className="mb-2 font-heading text-lg font-bold">Report Cards</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Student</th>
              <th className="pb-2">Exam</th>
              <th className="pb-2">Subject</th>
              <th className="pb-2">Marks</th>
              <th className="pb-2">Grade</th>
            </tr>
          </thead>
          <tbody>
            {reportCards.map((item) => (
              <tr key={item.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{item.student.admissionNo} - {item.student.firstName} {item.student.lastName}</td>
                <td className="py-2">{item.exam.title} ({new Date(item.exam.examDate).toLocaleDateString()})</td>
                <td className="py-2">{item.exam.subject.code} - {item.exam.subject.name}</td>
                <td className="py-2">{item.marks}</td>
                <td className="py-2">{item.grade} ({item.gpaPoints})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <h3 className="mb-2 font-heading text-lg font-bold">Fee Statements</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Invoice</th>
              <th className="pb-2">Total</th>
              <th className="pb-2">Outstanding</th>
              <th className="pb-2">Due Date</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">POP</th>
              <th className="pb-2">Approval</th>
            </tr>
          </thead>
          <tbody>
            {feeStatements.map((item) => (
              <tr key={item.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{item.invoiceNo}</td>
                <td className="py-2">{item.totalAmount}</td>
                <td className="py-2">{item.outstandingAmount}</td>
                <td className="py-2">{new Date(item.dueDate).toLocaleDateString()}</td>
                <td className="py-2">{item.status}</td>
                <td className="py-2">
                  <button className="rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-xs" type="button" onClick={() => openPopDialog(item)}>
                    Upload POP
                  </button>
                </td>
                <td className="py-2">
                  <button className="rounded-lg border border-blue-500 px-2 py-1 text-xs text-blue-600" type="button" onClick={() => openFeeStatementApprovalDialog(item)}>
                    Upload Approval
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {popStatus ? <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{popStatus}</p> : null}
        {approvalStatus ? <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{approvalStatus}</p> : null}
      </div>

      {showPopDialog && selectedInvoiceForPop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <h4 className="font-heading text-lg font-bold">Upload Proof of Payment</h4>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Invoice: {selectedInvoiceForPop.invoiceNo}</p>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="file" accept="image/*,.pdf" onChange={onPopFileChange} />
              <textarea className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" rows={3} placeholder="Notes (optional)" value={popNotes} onChange={(event) => setPopNotes(event.target.value)} />
              <div className="flex gap-2">
                <button className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={uploadingPop} onClick={uploadPop}>{uploadingPop ? "Uploading..." : "Upload"}</button>
                <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm" type="button" onClick={() => setShowPopDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showFeeStatementApprovalDialog && selectedInvoiceForApproval ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <h4 className="font-heading text-lg font-bold">Upload Fee Statement Approval</h4>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Invoice: {selectedInvoiceForApproval.invoiceNo}</p>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="file" accept=".pdf,.doc,.docx" onChange={onApprovalFileChange} />
              <textarea className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" rows={3} placeholder="Notes (optional)" value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} />
              <div className="flex gap-2">
                <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={uploadingApproval} onClick={uploadFeeStatementApproval}>{uploadingApproval ? "Uploading..." : "Upload"}</button>
                <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm" type="button" onClick={() => setShowFeeStatementApprovalDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAssignmentSubmissionDialog && selectedAssignmentForSubmission ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
            <h4 className="font-heading text-lg font-bold">Submit Assignment</h4>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Assignment: {selectedAssignmentForSubmission.title}</p>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="file" accept=".pdf,.doc,.docx" onChange={onSubmissionFileChange} />
              <textarea className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" rows={3} placeholder="Notes (optional)" value={submissionNotes} onChange={(event) => setSubmissionNotes(event.target.value)} />
              <div className="flex gap-2">
                <button className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={uploadingSubmission} onClick={uploadAssignmentSubmission}>{uploadingSubmission ? "Submitting..." : "Submit"}</button>
                <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm" type="button" onClick={() => setShowAssignmentSubmissionDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface space-y-3 p-4">
          <h3 className="font-heading text-lg font-bold">Send Portal Message</h3>
          {!canManagePortalContent ? <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">You have read-only access for portal publishing actions.</p> : null}
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" disabled={!canManagePortalContent} placeholder="Title" value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} />
          <textarea className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" disabled={!canManagePortalContent} rows={3} placeholder="Message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
          {messageError ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{messageError}</p> : null}
          {messageSuccess ? <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600">{messageSuccess}</p> : null}
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!canManagePortalContent || sendingMessage} type="button" onClick={sendMessage}>{sendingMessage ? "Sending..." : "Send"}</button>
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Search messages" value={messageSearch} onChange={(event) => { setMessageSearch(event.target.value); setMessageVisibleCount(5); }} />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Showing {Math.min(messageVisibleCount, filteredMessages.length)} of {filteredMessages.length} messages</p>
          <ul className="space-y-1 text-sm">
            {filteredMessages.slice(0, messageVisibleCount).map((item) => (
              <li key={item.id}>{item.title} ({new Date(item.sentAt).toLocaleDateString()})</li>
            ))}
          </ul>
          {messageVisibleCount < filteredMessages.length ? <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm" type="button" onClick={() => setMessageVisibleCount((current) => current + 5)}>Load 5 more</button> : null}
        </div>

        <div className="card-surface space-y-3 p-4">
          <h3 className="font-heading text-lg font-bold">Publish Assignment</h3>
          {!canManagePortalContent ? <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">You have read-only access for portal publishing actions.</p> : null}
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" disabled={!canManagePortalContent} placeholder="Title" value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} />
          <textarea className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" disabled={!canManagePortalContent} rows={3} placeholder="Description" value={assignmentDescription} onChange={(event) => setAssignmentDescription(event.target.value)} />
          {assignmentError ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{assignmentError}</p> : null}
          {assignmentSuccess ? <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600">{assignmentSuccess}</p> : null}
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!canManagePortalContent || publishingAssignment} type="button" onClick={publishAssignment}>{publishingAssignment ? "Publishing..." : "Publish"}</button>
        </div>

        <div className="card-surface space-y-3 p-4">
          <h3 className="font-heading text-lg font-bold">Assignments</h3>
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Search assignments" value={assignmentSearch} onChange={(event) => { setAssignmentSearch(event.target.value); setAssignmentVisibleCount(5); }} />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Showing {Math.min(assignmentVisibleCount, filteredAssignments.length)} of {filteredAssignments.length} assignments</p>
          <ul className="space-y-2">
            {filteredAssignments.slice(0, assignmentVisibleCount).map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-2 text-sm">
                <span>{item.title} - {item.status}</span>
                <button className="rounded-lg border border-green-500 px-2 py-1 text-xs text-green-600" type="button" onClick={() => openAssignmentSubmissionDialog(item)}>
                  Submit
                </button>
              </li>
            ))}
          </ul>
          {submissionStatus ? <p className="text-sm text-[hsl(var(--muted-foreground))]">{submissionStatus}</p> : null}
          {assignmentVisibleCount < filteredAssignments.length ? <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm" type="button" onClick={() => setAssignmentVisibleCount((current) => current + 5)}>Load 5 more</button> : null}
        </div>
      </div>
    </section>
  );
}
