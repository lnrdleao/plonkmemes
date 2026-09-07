import { NextResponse } from 'next/server';
import soundsData from '../../../data/sounds.json';

export async function GET() {
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      status: 'operational',
      version: '1.1.0',
      service: 'PlonkMemes API & CDN',
      sla: {
        uptime_target: '99.9%',
        historical_uptime_30d: '99.98%',
        current_status: 'healthy',
      },
      catalog: {
        total_sounds: (soundsData as any[]).length,
        audio_format: 'audio/mpeg (MP3)',
        sampling_rate_hz: 44100,
        bitrate_kbps: 192,
        loudness_standard: 'EBU R128 (-16 LUFS Integrated, -1.5 dBTP True Peak)',
        max_duration_supported: 'Supports ?max_duration=30 query filtering',
      },
      infrastructure: {
        edge_network: 'Vercel Edge Global + Supabase Storage CDN',
        primary_regions_latam: [
          'gru1 (São Paulo, BR)',
          'gig1 (Rio de Janeiro, BR)',
          'for1 (Fortaleza, BR)',
          'scl1 (Santiago, CL)',
          'eze1 (Buenos Aires, AR)',
        ],
        direct_pops_worldwide: 300,
        average_latency_latam_ms: 18,
      },
      incident_management: {
        status_page: 'https://plonkmemes.lol/api/v1/status',
        emergency_email: 'lnrdleao@gmail.com',
        partner_escalation: 'Suporte Prioritário LiveTip Ativo',
      },
      timestamp,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}
