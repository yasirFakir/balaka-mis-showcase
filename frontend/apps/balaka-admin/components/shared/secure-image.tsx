import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { User } from "lucide-react";
import { API_URL } from "@/core/api";

interface SecureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  serviceSlug?: string;
  fallback?: React.ReactNode;
}

export function SecureImage({ src, serviceSlug, fallback, alt, className, ...props }: SecureImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    setError(false); // Reset error state on new source

    const fetchImage = async () => {
      // 0. Handle blob URLs (immediate local previews)
      if (src && src.startsWith('blob:')) {
        setObjectUrl(src);
        return;
      }

      // 1. If we have a direct src, prioritize it
      if (src) {
        if (src.startsWith('/static/') || src.startsWith('http') || src.startsWith('/shared/')) {
          const fullUrl = src.startsWith('http') || src.startsWith('/shared/') ? src : `${API_URL}${src}`;
          setObjectUrl(fullUrl);
          return;
        }

        // If it's a secure API path (like /api/v1/files/secure/...)
        try {
          const token = localStorage.getItem("token");
          const fullUrl = `${API_URL}${src}`;
          
          const res = await fetch(fullUrl, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (!res.ok) throw new Error("Failed to load image");

          const blob = await res.blob();
          if (mounted) {
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
          }
        } catch (err) {
          console.error("SecureImage fetch error:", err);
          if (mounted) {
             if (serviceSlug) {
                setObjectUrl(`/shared/images/services/svc-${serviceSlug}.webp`);
             } else {
                setError(true);
             }
          }
        }
      } 
      // 2. Handle explicit removal (src is null)
      else if (src === null) {
          setError(true);
      }
      // 3. Systematic slug-based path if no src (src is undefined)
      else if (serviceSlug) {
          setObjectUrl(`/shared/images/services/svc-${serviceSlug}.webp`);
      } else {
          setError(true);
      }
    };

    fetchImage();

    return () => {
      mounted = false;
      // Only revoke if we created it (it will be different from props.src)
      if (objectUrl && objectUrl.startsWith('blob:') && objectUrl !== src) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, serviceSlug]);

  const handleImageError = () => {
    // If the systematic slug also failed, show fallback
    if (objectUrl === `/shared/images/services/svc-${serviceSlug}.webp`) {
        setError(true);
    } else if (serviceSlug) {
        setObjectUrl(`/shared/images/services/svc-${serviceSlug}.webp`);
    } else {
        setError(true);
    }
  };

  if (error || !objectUrl) {
    return fallback ? <>{fallback}</> : <User className={className} />;
  }

  return (
    <img 
      src={objectUrl} 
      alt={alt || "Secure Image"} 
      className={className} 
      onError={handleImageError}
      {...props} 
    />
  );
}
