import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// TypeScript interfaces
export interface Question {
  text: string
  options: string[]
  correct: number
  points: number
  timer: number
}

export interface Answer {
  questionIndex: number
  selectedOption: number | null
  correct: boolean
  points: number
  timeLeft?: number
}

export interface Session {
  id: string
  type: 'quiz' | 'test'
  title: string
  status: 'waiting' | 'active' | 'finished'
  questions: Question[]
  current_q: number
  timer_secs: number
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  name: string
  klasse: string
  pin?: string
  score: number
  answers: Answer[]
  note?: string
  joined_at: string
}

export interface Event {
  id: string
  session_id: string
  type: string
  payload: Record<string, unknown>
  created_at: string
}

// Helper functions
export async function createSession(
  title: string,
  type: 'quiz' | 'test',
  questions: Question[],
  timer_secs: number = 30
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ title, type, questions, timer_secs })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function joinSession(
  sessionId: string,
  name: string,
  klasse: string,
  pin?: string
): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .insert({ session_id: sessionId, name, klasse, pin: pin ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function sendEvent(
  sessionId: string,
  type: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .insert({ session_id: sessionId, type, payload })
  if (error) throw error
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'waiting' | 'active' | 'finished',
  extra: Partial<Pick<Session, 'current_q'>> = {}
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ status, ...extra })
    .eq('id', sessionId)
  if (error) throw error
}

export async function saveAnswer(
  participantId: string,
  answers: Answer[],
  score: number
): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update({ answers, score })
    .eq('id', participantId)
  if (error) throw error
}

export async function verifyPin(pin: string): Promise<{ name: string; klasse: string } | null> {
  const { data, error } = await supabase
    .from('pins')
    .select('name, klasse')
    .eq('pin', pin)
    .single()
  if (error || !data) return null
  return data
}

export function sessionCodeFromId(id: string): string {
  return id.replace(/-/g, '').substring(0, 6).toUpperCase()
}

export async function findSessionByCode(code: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data) return null
  const match = (data as Session[]).find(s => sessionCodeFromId(s.id) === code.toUpperCase())
  return match ?? null
}
