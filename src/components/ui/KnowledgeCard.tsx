import type { PersonalizedContent } from '@/types';

interface KnowledgeCardProps {
  content: PersonalizedContent;
}

export function KnowledgeCard({ content }: KnowledgeCardProps) {
  const urgencyColors = {
    low: 'bg-green-50 border-green-200',
    medium: 'bg-yellow-50 border-yellow-200',
    high: 'bg-red-50 border-red-200'
  };

  return (
    <div className={`rounded-xl p-6 border-2 ${urgencyColors[content.urgencyLevel]} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{content.title}</h3>
        <div className="flex flex-wrap gap-1">
          {content.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      <p className="text-gray-700 mb-4 leading-relaxed">
        {content.content}
      </p>
      
      {content.actionItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-800">今日建议：</h4>
          <ul className="space-y-1">
            {content.actionItems.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}