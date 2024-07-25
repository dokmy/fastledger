import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabaseClient'


export async function POST(req: Request) {
  console.log('Webhook received');

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Webhook secret not set');
    return NextResponse.json({ error: 'Webhook secret not set' }, { status: 500 })
  }

  const wh = new Webhook(webhookSecret)
  let evt: WebhookEvent

  
  try {
    evt = wh.verify(payload, headers) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({}, { status: 400 })
  }

  const eventType = evt.type
  console.log(`Processing event: ${eventType}`);

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data as any
    const userData = {
      clerk_id: id,
      email: email_addresses[0]?.email_address,
      first_name,
      last_name,
    };
    console.log('User data:', userData);

    // Insert user into clerk_users table
    const { data: insertedUser, error: userError } = await supabase.from('clerk_users').upsert(userData);
    if (userError) {
      console.error('Supabase error (clerk_users):', userError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Insert a row into user_credits table (it will have default 20 credits)
    const { error: creditError } = await supabase.from('user_credits').insert({
      clerk_id: id
    });
    if (creditError) {
      console.error('Supabase error (user_credits):', creditError);
      return NextResponse.json({ error: 'Failed to add initial credits' }, { status: 500 })
    }

    console.log('User created and initial credits added successfully');
  } else if (eventType === 'user.updated') {
    // Handle user update logic
    const { id, email_addresses, first_name, last_name } = evt.data as any
    const updatedUserData = {
      clerk_id: id,
      email: email_addresses[0]?.email_address,
      first_name,
      last_name,
    };
    const { error: updateError } = await supabase.from('clerk_users').upsert(updatedUserData);
    if (updateError) {
      console.error('Supabase error (user update):', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    console.log('User updated successfully');
  } else if (eventType === 'user.deleted') {
    const { id } = evt.data as any
    const { error: deleteError } = await supabase.from('clerk_users').delete().match({ clerk_id: id })
    if (deleteError) {
      console.error('Supabase error (user deletion):', deleteError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
    console.log('User deleted successfully');
  }

  return NextResponse.json({})
}