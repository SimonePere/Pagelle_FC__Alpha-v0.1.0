// Interfaccia allineata con backend
export interface NewsItem {
    _id: string;
    text: string;
    category: string;
    type: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    icon: string;
    style: 'success' | 'warning' | 'info' | 'default';
    createdAt: string;
    teamId: string;
    eventData?: any;
}

export interface NewsResponse {
    success: boolean;
    data: NewsItem[];
    count: number;
    teamId: string;
    cached?: boolean;
}