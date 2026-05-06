import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface RatingSliderProps {
    value: number;
    onChange: (v: number) => void;
};

export const RatingSlider = ({ value, onChange }: RatingSliderProps) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <Label className="text-muted-foreground text-sm shrink-0">Voto</Label>
                <Slider
                    value={[value]}
                    onValueChange={([v]) => onChange(v)}
                    min={1}
                    max={10}
                    step={0.25}
                    className="w-full"
                />
            </div>
        </div>
    );
};

// Backward-compatible alias, removable after call sites are migrated.
export const QuickRatingInput = RatingSlider;
