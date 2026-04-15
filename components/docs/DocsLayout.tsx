'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DocsSidebar from './DocsSidebar';
import PageEditor from './PageEditor';

export default function DocsLayout() {
  const searchParams = useSearchParams();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Read ?page= from URL (e.g. from search navigation)
  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl) {
      setSelectedPageId(pageFromUrl);
    }
  }, [searchParams]);

  function handleDeleted() {
    setSelectedPageId(null);
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <DocsSidebar
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onRefresh={refreshKey}
      />
      <PageEditor
        pageId={selectedPageId}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
