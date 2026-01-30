import { TrendingUp, BookOpen, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecommendationCard = ({ scorePercentage }) => {
    const navigate = useNavigate();

    let content = {
        color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-800 dark:text-blue-300',
        icon: <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />,
        title: 'Good Progress!',
        message: 'You are doing well. Creating a consistent practice habit is key.',
        action: 'Review Concepts'
    };

    if (scorePercentage >= 80) {
        content = {
            color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
            textColor: 'text-green-800 dark:text-green-300',
            icon: <TrendingUp className="text-green-600 dark:text-green-400" size={24} />,
            title: 'Excellent Work!',
            message: 'You demonstrated strong understanding. You are ready for more advanced challenges.',
            action: 'Next Level'
        };
    } else if (scorePercentage < 50) {
        content = {
            color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
            textColor: 'text-orange-800 dark:text-orange-300',
            icon: <AlertCircle className="text-orange-600 dark:text-orange-400" size={24} />,
            title: 'Keep Practicing',
            message: 'It seems you faced some difficulties. We recommend reviewing the core concepts.',
            action: 'Review Material'
        };
    }

    return (
        <div className={`p-6 rounded-lg border ${content.color} transition-all duration-300 hover:shadow-md dark:hover:shadow-slate-900/50`}>
            <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                    {content.icon}
                </div>
                <div>
                    <h3 className={`text-lg font-bold ${content.textColor} mb-2`}>
                        {content.title}
                    </h3>
                    <p className="text-gray-700 dark:text-slate-300 mb-4 leading-relaxed">
                        {content.message}
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`text-sm font-semibold ${content.textColor} hover:underline`}
                    >
                        {content.action} →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
