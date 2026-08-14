import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { uploadAvatar, deleteAvatar } from '@/redux/slices/authSlice';
import { uploadTeamAvatar, deleteTeamAvatar } from '@/redux/slices/teamSlice';
import { AppDispatch } from '@/redux/store/store';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Loader2, Trash2, Upload } from 'lucide-react';

interface AvatarUploaderProps {
    /** 'user' per foto profilo, 'team' per stemma */
    ownerType?: 'user' | 'team';
    /** ID del team, richiesto quando ownerType === 'team' */
    teamId?: string;
    /** Callback dopo upload/rimozione (refresh dati) */
    onSuccess?: () => void;
    /** Classe CSS customizzabile */
    className?: string;
}

/**
 * AvatarUploader — Componente per caricamento/rimozione avatar
 * 
 * Features:
 * - Upload da file
 * - Resize client-side (256x256, crop centrato quadrato)
 * - Compressione WebP 0.8
 * - Anteprima
 * - Rimozione avatar
 * - Gestione errori
 */
export function AvatarUploader({
    ownerType = 'user',
    teamId,
    onSuccess,
    className = ''
}: AvatarUploaderProps) {
    const dispatch = useDispatch<AppDispatch>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Costanti per il resize
    const TARGET_SIZE = 256;
    const MAX_FILE_SIZE = 200000; // 200KB hard cap
    const COMPRESSION_QUALITY = 0.8;

    /**
     * Valida e ridimensiona l'immagine
     */
    async function resizeImage(file: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            // 1. Valida il MIME type
            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedMimes.includes(file.type)) {
                throw new Error(`File type not supported: ${file.type}`);
            }

            // 2. Leggi il file
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // 3. Crea canvas 256x256
                    const canvas = document.createElement('canvas');
                    canvas.width = TARGET_SIZE;
                    canvas.height = TARGET_SIZE;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    // 4. Calcola crop centrato quadrato
                    const size = Math.min(img.width, img.height);
                    const x = (img.width - size) / 2;
                    const y = (img.height - size) / 2;

                    // 5. Draw immagine centrata e ridimensionata
                    ctx.drawImage(img, x, y, size, size, 0, 0, TARGET_SIZE, TARGET_SIZE);

                    // 6. Converti a WebP blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to blob failed'));
                                return;
                            }

                            // 7. Valida dimensione
                            if (blob.size > MAX_FILE_SIZE) {
                                reject(new Error(`Image too large: ${blob.size} bytes. Max: ${MAX_FILE_SIZE}`));
                                return;
                            }

                            resolve(blob);
                        },
                        'image/webp',
                        COMPRESSION_QUALITY
                    );
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Handle file selection
     */
    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (ownerType === 'team' && !teamId) {
            setError('teamId mancante: impossibile caricare lo stemma');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            // 1. Resize immagine
            const resizedBlob = await resizeImage(file);

            // 2. Crea anteprima
            const previewUrl = URL.createObjectURL(resizedBlob);
            setPreview(previewUrl);

            // 3. Upload (utente o team, in base a ownerType)
            const result = ownerType === 'team'
                ? await dispatch(uploadTeamAvatar({ teamId: teamId as string, blob: resizedBlob }))
                : await dispatch(uploadAvatar(resizedBlob));

            if (result.meta.requestStatus === 'fulfilled') {
                toast.success(ownerType === 'team' ? 'Stemma caricato con successo' : 'Foto caricata con successo');
                onSuccess?.();
            } else {
                throw new Error(result.payload as string);
            }
        } catch (err: any) {
            const errMessage = err.message || 'Upload fallito';
            setError(errMessage);
            toast.error(errMessage);
            setPreview(null);
        } finally {
            setIsLoading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    /**
     * Handle avatar removal
     */
    async function handleDelete() {
        if (ownerType === 'team' && !teamId) {
            setError('teamId mancante: impossibile rimuovere lo stemma');
            return;
        }

        if (!confirm(ownerType === 'team' ? 'Rimuovere lo stemma del team?' : 'Rimuovere la foto profilo?')) return;

        setError(null);
        setIsLoading(true);

        try {
            const result = ownerType === 'team'
                ? await dispatch(deleteTeamAvatar(teamId as string))
                : await dispatch(deleteAvatar());

            if (result.meta.requestStatus === 'fulfilled') {
                toast.success(ownerType === 'team' ? 'Stemma rimosso' : 'Foto rimossa');
                setPreview(null);
                onSuccess?.();
            } else {
                throw new Error(result.payload as string);
            }
        } catch (err: any) {
            const errMessage = err.message || 'Rimozione fallita';
            setError(errMessage);
            toast.error(errMessage);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {/* Anteprima */}
            {preview && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Errore */}
            {error && (
                <div className="bg-red-100 text-red-800 text-sm p-3 rounded">
                    {error}
                </div>
            )}

            {/* Bottoni */}
            <div className="flex gap-2">
                <label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={isLoading}
                        className="hidden"
                    />
                    <Button
                        asChild
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                    >
                        <span>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                                    <span className="hidden sm:inline">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Choose Photo</span>
                                </>
                            )}
                        </span>
                    </Button>
                </label>

                <Button
                    onClick={handleDelete}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                >
                    <Trash2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Remove</span>
                </Button>
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-500">
                {ownerType === 'user'
                    ? 'JPG, PNG, WebP • Max 200KB (auto-resized to 256×256)'
                    : 'Team logo • JPG, PNG, WebP • Max 200KB (auto-resized to 256×256)'}
            </p>
        </div>
    );
}
