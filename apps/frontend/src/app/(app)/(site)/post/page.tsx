import { Metadata } from 'next';
import { PostPage } from '@vibeschedule/frontend/components/new-launch/post.page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Posten | vibeschedule',
};

export default function Page() {
  return <PostPage />;
}
