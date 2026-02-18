import { InterviewRoom } from '@/components/interview-room';

export default function InterviewPage({ params }: { params: { candidateId: string } }) {
  return <InterviewRoom candidateId={params.candidateId} />;
}
