import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { ChevronDown, Users, Loader2 } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    description?: string;
}

interface OptionsDropdownProps {
    label: string;
    placeholder: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    loading?: boolean;
    allowEmpty?: boolean;
    emptyLabel?: string;
    icon?: React.ComponentType<{ className?: string }>;
    error?: string;
}

const OptionsDropdown = ({
    label,
    placeholder,
    options,
    value,
    onChange,
    loading = false,
    allowEmpty = true,
    emptyLabel = 'Nessuna selezione',
    icon: Icon = Users,
    error
}: OptionsDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find(opt => opt.id === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className="space-y-2 dropdown-container">
            <Label className="flex items-center gap-2 text-foreground font-medium">
                <Icon className="w-4 h-4 text-primary" />
                {label}
            </Label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !loading && setIsOpen(!isOpen)}
                    disabled={loading}
                    className={`w-full h-12 px-3 py-2 bg-secondary/40 border border-border rounded-md text-left flex items-center justify-between focus:border-primary focus:outline-none transition-all ${loading ? 'cursor-not-allowed opacity-50' : 'hover:bg-secondary/60 cursor-pointer'
                        } ${error ? 'border-destructive' : ''}`}
                >
                    <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
                        {loading ? 'Caricamento...' : (selectedOption?.name || placeholder)}
                    </span>

                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                </button>

                {isOpen && !loading && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card/90 backdrop-blur-sm border border-border rounded-md shadow-card max-h-60 overflow-y-auto z-50">
                        {allowEmpty && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-secondary/40 border-b border-border/50 text-muted-foreground"
                            >
                                {emptyLabel}
                            </button>
                        )}

                        {options.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    onChange(option.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-secondary/40 transition-colors ${option.id === value ? 'bg-primary/10 text-primary' : 'text-foreground'
                                    }`}
                            >
                                <div>
                                    <div className="font-medium">{option.name}</div>
                                    {option.description && (
                                        <div className="text-sm text-muted-foreground">{option.description}</div>
                                    )}
                                </div>
                            </button>
                        ))}

                        {options.length === 0 && (
                            <div className="px-3 py-2 text-muted-foreground text-center">
                                Nessuna opzione disponibile
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
};

export default OptionsDropdown;