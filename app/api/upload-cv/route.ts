import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeCV } from '@/lib/gemini';
import { updateCandidateCV } from '@/lib/db';
import { extractPdfText } from '@/lib/pdf';

const schema = z.object({
  candidateId: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const candidateIdRaw = formData.get('candidateId');
    const file = formData.get('cv');

    const parsed = schema.safeParse({ candidateId: candidateIdRaw });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const isFile = file instanceof File;
    const fileName = isFile ? file.name.toLowerCase() : '';
    const isPdfType = isFile && (file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.type === '');
    const isPdfName = fileName.endsWith('.pdf');

    if (!isFile || (!isPdfType && !isPdfName)) {
      return NextResponse.json({ error: 'Please upload a valid PDF CV.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const cvText = await extractPdfText(bytes);
    const cvAnalysis = await analyzeCV(cvText);

    await updateCandidateCV(parsed.data.candidateId, cvText, cvAnalysis.summary);

    return NextResponse.json({
      summary: cvAnalysis.summary,
      keySkills: cvAnalysis.keySkills,
      cvTextLength: cvText.length
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
