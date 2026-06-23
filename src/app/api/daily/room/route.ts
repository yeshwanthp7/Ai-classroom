import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { sessionCode } = await req.json();

    if (!sessionCode) {
      return NextResponse.json({ error: 'Session code is required' }, { status: 400 });
    }

    const DAILY_API_KEY = process.env.DAILY_API_KEY;

    if (!DAILY_API_KEY) {
      console.error('DAILY_API_KEY is not configured');
      return NextResponse.json({ error: 'Daily.co is not configured' }, { status: 500 });
    }

    // Attempt to create a room. The room name will be the session code.
    // If the room already exists, Daily API returns a 400 error for duplicate room name.
    // We can handle that by just fetching the existing room.
    const roomName = `ai-class-${sessionCode}`;

    let roomResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Expires in 24 hours
          enable_chat: true,
          enable_screenshare: false,
          start_audio_off: false,
          start_video_off: false,
        },
      }),
    });

    let roomData = await roomResponse.json();

    if (!roomResponse.ok) {
      // If room already exists, fetch it instead
      if (roomData.info && roomData.info.includes('already exists')) {
        const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
        });
        
        if (getResponse.ok) {
          roomData = await getResponse.json();
        } else {
          return NextResponse.json({ error: 'Failed to retrieve existing room' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: roomData.info || 'Failed to create room' }, { status: 500 });
      }
    }

    return NextResponse.json({ url: roomData.url });
  } catch (error) {
    console.error('Error creating Daily room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
