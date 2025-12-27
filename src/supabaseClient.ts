import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcpcdceubfwuinlwaimn.supabase.co'
const supabaseKey = 'sb_publishable_FS_M_5LeC1lRynZTScqXeQ_kdHLD9dw'

export const supabase = createClient(supabaseUrl, supabaseKey)