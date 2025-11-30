import { Signal } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink } from 'lucide-react';

interface NewsPanelProps {
  signals: Signal[];
  selectedSignal: Signal | null;
  onSignalClick: (signalId: string) => void;
  currentDate: string;
}

const SIGNAL_COLORS: Record<string, string> = {
  macro: '#F59E0B',
  geopolitical: '#EF4444',
  rates: '#10B981',
  custom: '#8B5CF6',
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  macro: 'Macro',
  geopolitical: 'Geopolitical',
  rates: 'Rates',
  custom: 'Custom',
};

export function NewsPanel({
  signals,
  selectedSignal,
  onSignalClick,
  currentDate,
}: NewsPanelProps) {
  // Filter signals visible around current date (within a range)
  const visibleSignals = signals.filter(signal => {
    const signalDate = new Date(signal.date);
    const current = new Date(currentDate);
    const daysDiff = Math.abs((signalDate.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30; // Show signals within 30 days
  });

  // Sort by date (most recent first)
  const sortedSignals = [...visibleSignals].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="h-48 bg-card border-t border-border flex flex-col flex-shrink-0">
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-foreground">News & Signals</h2>
            <p className="text-xs text-muted-foreground">
              {sortedSignals.length} signal{sortedSignals.length !== 1 ? 's' : ''} near current date
            </p>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {sortedSignals.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">
              No signals found near the current date
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sortedSignals.map(signal => {
                const isSelected = selectedSignal?.id === signal.id;
                return (
                  <Card
                    key={signal.id}
                    className={`cursor-pointer transition-all hover:border-primary flex-shrink-0 min-w-[280px] max-w-[320px] ${
                      isSelected ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => onSignalClick(signal.id)}
                  >
                    <CardHeader className="pb-2 px-3 pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: SIGNAL_COLORS[signal.type] }}
                            />
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {SIGNAL_TYPE_LABELS[signal.type]}
                            </Badge>
                            <Badge
                              variant={
                                signal.importance === 'high' ? 'destructive' :
                                signal.importance === 'medium' ? 'default' : 'secondary'
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {signal.importance.toUpperCase()}
                            </Badge>
                          </div>
                          <CardTitle className="text-xs font-semibold line-clamp-2 leading-tight">
                            {signal.title}
                          </CardTitle>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {signal.date}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    {isSelected && (
                      <CardContent className="pt-0 px-3 pb-3">
                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                          {signal.description}
                        </p>
                        {signal.externalUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1.5 w-full h-7 text-[10px]"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={signal.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 justify-center"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              Open Source
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

