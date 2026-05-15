"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/core/api";
import { User } from "lucide-react";

interface SecureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  serviceSlug?: string;
  fallback?: React.ReactNode;
}

export function SecureImage({ src, serviceSlug, fallback, alt, className, ...props }: SecureImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { user } = useAuth(); // Just to trigger re-renders if auth changes

  useEffect(() => {
    let mounted = true;

    const fetchImage = async () => {
      // 1. If we have a direct src, prioritize it
      if (src) {
        if (src.startsWith('/static/') || src.startsWith('http') || src.startsWith('/shared/')) {
          const fullUrl = src.startsWith('http') || src.startsWith('/shared/') ? src : `${API_URL}${src}`;
          setObjectUrl(fullUrl);
          return;
        }

        // If it's a secure API path
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
      // 2. Systematic slug-based path if no src
      else if (serviceSlug) {
          setObjectUrl(`/shared/images/services/svc-${serviceSlug}.webp`);
      } else {
          setError(true);
      }
    };

    fetchImage();

    return () => {
      mounted = false;
      if (objectUrl && objectUrl.startsWith('blob:')) {
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