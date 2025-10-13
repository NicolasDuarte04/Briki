import HomeClient from "@/components/HomeClient";

interface PageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  // Await params as required in Next.js 15
  const { id } = await params;
  
  // The HomeClient will handle hydrating the conversation from the URL
  return <HomeClient initialStep="conversation" conversationId={id} />;
}

