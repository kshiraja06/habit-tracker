import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (session) {
      return NextResponse.json({
        userId: session.user.id,
        isAnonymous: session.user.is_anonymous ?? false,
      });
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (!data.user) {
      return NextResponse.json({ error: "Supabase did not return a user." }, { status: 502 });
    }

    return NextResponse.json({
      userId: data.user.id,
      isAnonymous: data.user.is_anonymous ?? true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create an anonymous session.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
