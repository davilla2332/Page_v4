import { supabase, requirePermanentUser } from './supabase.js';
import { APP_CONFIG } from './config.js';

async function collectStoryMemory() {
  const [chapters, memories, events, plans, coupleRow] = await Promise.all([
    supabase.from('chapters').select('chapter_number,chapter_date,title,body').is('deleted_at', null).order('chapter_number').limit(20),
    supabase.from('memories').select('title,description,memory_date,place,tags,favorite').is('deleted_at', null).order('memory_date', { ascending: false }).limit(25),
    supabase.from('events').select('title,event_date,event_type,description').is('deleted_at', null).order('event_date').limit(20),
    supabase.from('plans').select('title,details,target_date,completed').is('deleted_at', null).order('created_at').limit(20),
    supabase.from('site_content').select('value').eq('key','couple').maybeSingle()
  ]);
  return {
    couple: coupleRow.data?.value || APP_CONFIG.couple,
    chapters: chapters.data || [],
    memories: memories.data || [],
    important_dates: events.data || [],
    plans: plans.data || []
  };
}

export async function generateWithAI({ type='general', prompt='', context={}, maxLength=600 }) {
  await requirePermanentUser();
  const storyMemory = await collectStoryMemory();
  const { data, error } = await supabase.functions.invoke(APP_CONFIG.supabase.aiFunction, {
    body: {
      type,
      prompt,
      context: { ...storyMemory, current_task: context },
      maxLength
    }
  });
  if (error) throw error;
  if (!data?.text) throw new Error(data?.error || 'La IA no devolvió texto.');
  return data.text.trim();
}
