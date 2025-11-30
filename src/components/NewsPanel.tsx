import { Signal } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface NewsPanelProps {
  selectedSignal: Signal | null;
}

export function NewsPanel({ selectedSignal }: NewsPanelProps) {
  if (!selectedSignal) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-[#6B7280]">Click a news signal to view details</p>
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className="text-xs font-medium border-[#374151] text-[#9CA3AF]"
            >
              {selectedSignal.type.toUpperCase()}
            </Badge>
            <Badge 
              variant={
                selectedSignal.importance === 'high' ? 'destructive' :
                selectedSignal.importance === 'medium' ? 'default' : 'secondary'
              }
              className="text-xs"
            >
              {selectedSignal.importance.toUpperCase()}
            </Badge>
            <span className="text-xs text-[#6B7280] font-mono">{selectedSignal.date}</span>
          </div>
          
          <h3 className="text-lg font-semibold text-[#E5E7EB] leading-tight">
            {selectedSignal.title}
          </h3>
          
          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            {selectedSignal.description}
          </p>
        </div>

        {selectedSignal.externalUrl && (
          <Button 
            variant="outline" 
            size="sm"
            className="flex-shrink-0 rounded-none bg-[#1E293B] hover:bg-[#334155] border-[#374151] text-[#E5E7EB]"
            asChild
          >
            <a 
              href={selectedSignal.externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <span>Open Source</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
