/**
 * AgentShield Core TypeScript Type Definitions
 * Exact mirrors of FastAPI backend schemas
 */

export type Role =
  | 'ADMIN'
  | 'SECURITY_ANALYST'
  | 'EMPLOYEE'
  | 'GUEST'
  | 'UNTRUSTED_AGENT'
  | 'ANONYMOUS';

export interface MockActor {
  actor_id: string;
  role: Role;
  description: string;
  api_key: string;
  permissions: string[];
}

export interface UserSession {
  actor_id: string;
  role: Role;
  name: string;
  email: string;
  api_key: string;
}

export type TaskStatus =
  | 'PENDING'
  | 'PLANNING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export interface ToolCallProposal {
  tool: string;
  action: string;
  parameters: Record<string, any>;
  reasoning?: string;
}

export type StepStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'POLICY_BLOCKED'
  | 'GUARDIAN_BLOCKED'
  | 'PENDING_APPROVAL'
  | 'SKIPPED';

export interface StepResult {
  step_number: number;
  tool: string;
  action: string;
  parameters: Record<string, any>;
  status: StepStatus;
  output?: any;
  error?: string | null;
  timestamp: string;
  duration_ms?: number;
}

export interface TaskResponse {
  task_id: string;
  actor_id: string;
  role: string;
  instruction: string;
  status: TaskStatus;
  created_at: string;
  completed_at?: string | null;
  steps: StepResult[];
  summary?: string | null;
  error?: string | null;
}

// Red Team Schemas
export type AttackCategory =
  | 'prompt_injection_email'
  | 'prompt_injection_web'
  | 'privilege_escalation'
  | 'payment_fraud'
  | 'tool_abuse'
  | 'loop_exhaustion';

export type AttackOutcome =
  | 'DEFENDED'
  | 'BREACHED'
  | 'ERROR'
  | 'SKIPPED';

export interface AttackResult {
  attack_id: string;
  name: string;
  category: AttackCategory;
  payload: string;
  outcome: AttackOutcome;
  defended: boolean;
  defence_mechanism?: string;
  task_id?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export type CampaignStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface CampaignResponse {
  campaign_id: string;
  campaign_name: string;
  description?: string;
  status: CampaignStatus;
  categories: AttackCategory[];
  total_attacks: number;
  attacks_landed: number;
  defences_held: number;
  results: AttackResult[];
  started_at: string;
  completed_at?: string;
  target_actor_key_hint?: string;
}

export interface AttackCatalogEntry {
  attack_id: string;
  name: string;
  category: AttackCategory;
  category_name: string;
  description: string;
  default_payload: string;
  target_tool: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  expected_control: string;
}

// Blue Guardian Schemas
export type GuardianDecision = 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK';

export interface RiskSignal {
  signal_id: string;
  description: string;
  weight: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MLInferenceMetadata {
  is_suspicious: boolean;
  probability: number;
  decision_margin: number;
  risk_score: number;
  label: string;
  confidence_disclaimer?: string;
}

export interface GuardianVerdict {
  verdict: GuardianDecision;
  risk_score: number;
  intent_alignment: number;
  signals_triggered: RiskSignal[];
  ml_advisory?: MLInferenceMetadata | null;
  summary_reason: string;
}

export interface GuardianDecisionRecord {
  record_id: string;
  task_id: string;
  step_number: number;
  actor_id: string;
  tool: string;
  action: string;
  parameters: Record<string, any>;
  verdict: GuardianDecision;
  risk_score: number;
  intent_alignment: number;
  signals_triggered: RiskSignal[];
  ml_advisory?: MLInferenceMetadata | null;
  summary_reason: string;
  timestamp: string;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  approval_id: string;
  task_id: string;
  step_number: number;
  tool: string;
  action: string;
  parameters: Record<string, any>;
  risk_score: number;
  reason: string;
  status: ApprovalStatus;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  decision_note?: string;
}

// Audit & Tools Schemas
export interface AuditLogEntry {
  event_id: string;
  timestamp: string;
  actor_id: string;
  role: string;
  tool: string;
  action: string;
  resource?: string;
  status: 'ALLOWED' | 'DENIED' | 'FAILED' | 'WARNING';
  details?: Record<string, any>;
}

export interface EmailMessage {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  folder: 'inbox' | 'sent' | 'archive';
  is_adversarial?: boolean;
  attack_type?: string;
}

export interface VirtualFile {
  path: string;
  content: string;
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  size_bytes: number;
  updated_at: string;
}

export interface WebPage {
  page_id: string;
  url: string;
  title: string;
  content: string;
  classification: 'PUBLIC_INFO' | 'INTERNAL_WIKI' | 'PHISHING' | 'INJECTION_FORUM';
}

export interface PaymentTransaction {
  transaction_id: string;
  recipient: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'REJECTED';
  created_at: string;
  authorized_by?: string;
}

