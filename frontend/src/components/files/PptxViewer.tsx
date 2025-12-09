import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface PptxViewerProps {
  fileUrl: string;
}

interface SlideContent {
  index: number;
  texts: string[];
  images: { src: string; alt: string }[];
  backgroundImage?: string;
}

interface ParsedPptx {
  slides: SlideContent[];
  error?: string;
}

// Parse PPTX file from URL
async function parsePptx(url: string): Promise<ParsedPptx> {
  try {
    // Fetch the PPTX file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Get presentation.xml to find slide order
    const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
    if (!presentationXml) {
      throw new Error("Invalid PPTX: presentation.xml not found");
    }

    // Parse slide count from presentation.xml
    const parser = new DOMParser();
    const presentationDoc = parser.parseFromString(presentationXml, "application/xml");
    const slideIdList = presentationDoc.getElementsByTagName("p:sldIdLst")[0];
    const slideCount = slideIdList?.children.length || 0;

    if (slideCount === 0) {
      // Fallback: count slide files
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.match(/^ppt\/slides\/slide\d+\.xml$/)
      );
      return await parseSlides(zip, slideFiles.length, parser);
    }

    return await parseSlides(zip, slideCount, parser);
  } catch (error) {
    console.error("PPTX parse error:", error);
    return {
      slides: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function parseSlides(
  zip: JSZip,
  slideCount: number,
  parser: DOMParser
): Promise<ParsedPptx> {
  const slides: SlideContent[] = [];

  // Extract media files for reference
  const mediaFiles: Record<string, string> = {};
  const mediaFolder = zip.folder("ppt/media");
  if (mediaFolder) {
    const mediaEntries = Object.entries(zip.files).filter(([name]) =>
      name.startsWith("ppt/media/")
    );
    for (const [name, file] of mediaEntries) {
      if (!file.dir) {
        const blob = await file.async("blob");
        const mediaName = name.replace("ppt/media/", "");
        mediaFiles[mediaName] = URL.createObjectURL(blob);
      }
    }
  }

  for (let i = 1; i <= slideCount; i++) {
    const slideXml = await zip.file(`ppt/slides/slide${i}.xml`)?.async("text");
    if (!slideXml) continue;

    const slideDoc = parser.parseFromString(slideXml, "application/xml");
    const slide: SlideContent = {
      index: i,
      texts: [],
      images: [],
    };

    // Extract text content
    const textElements = slideDoc.getElementsByTagName("a:t");
    const seenTexts = new Set<string>();
    for (let j = 0; j < textElements.length; j++) {
      const text = textElements[j].textContent?.trim();
      if (text && !seenTexts.has(text)) {
        seenTexts.add(text);
        slide.texts.push(text);
      }
    }

    // Get relationships for images
    const relsXml = await zip
      .file(`ppt/slides/_rels/slide${i}.xml.rels`)
      ?.async("text");
    const relsMap: Record<string, string> = {};
    if (relsXml) {
      const relsDoc = parser.parseFromString(relsXml, "application/xml");
      const relationships = relsDoc.getElementsByTagName("Relationship");
      for (let j = 0; j < relationships.length; j++) {
        const rel = relationships[j];
        const id = rel.getAttribute("Id") || "";
        const target = rel.getAttribute("Target") || "";
        if (target.includes("media/")) {
          const mediaName = target.split("/").pop() || "";
          if (mediaFiles[mediaName]) {
            relsMap[id] = mediaFiles[mediaName];
          }
        }
      }
    }

    // Extract images
    const blipElements = slideDoc.getElementsByTagName("a:blip");
    for (let j = 0; j < blipElements.length; j++) {
      const embed = blipElements[j].getAttribute("r:embed");
      if (embed && relsMap[embed]) {
        slide.images.push({
          src: relsMap[embed],
          alt: `Slide ${i} Image ${j + 1}`,
        });
      }
    }

    slides.push(slide);
  }

  return { slides };
}

export function PptxViewer({ fileUrl }: PptxViewerProps) {
  const [parsedPptx, setParsedPptx] = useState<ParsedPptx | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPptx() {
      setLoading(true);
      const result = await parsePptx(fileUrl);
      if (mounted) {
        setParsedPptx(result);
        setCurrentSlide(0);
        setLoading(false);
      }
    }

    loadPptx();

    return () => {
      mounted = false;
      // Clean up blob URLs
      if (parsedPptx?.slides) {
        parsedPptx.slides.forEach((slide) => {
          slide.images.forEach((img) => {
            if (img.src.startsWith("blob:")) {
              URL.revokeObjectURL(img.src);
            }
          });
        });
      }
    };
  }, [fileUrl]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (parsedPptx?.slides) {
      setCurrentSlide((prev) =>
        Math.min(parsedPptx.slides.length - 1, prev + 1)
      );
    }
  }, [parsedPptx]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  if (loading) {
    return (
      <div className="pptx-viewer-loading">
        <Loader2 className="animate-spin" size={48} />
        <p>プレゼンテーションを読み込み中...</p>
      </div>
    );
  }

  if (parsedPptx?.error) {
    return (
      <div className="pptx-viewer-error">
        <p>プレゼンテーションを読み込めませんでした</p>
        <p className="error-detail">{parsedPptx.error}</p>
      </div>
    );
  }

  if (!parsedPptx?.slides.length) {
    return (
      <div className="pptx-viewer-error">
        <p>スライドが見つかりませんでした</p>
      </div>
    );
  }

  const slide = parsedPptx.slides[currentSlide];
  const totalSlides = parsedPptx.slides.length;

  return (
    <div
      className="pptx-viewer"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Slide content */}
      <div className="pptx-slide">
        <div className="pptx-slide-content">
          {/* Images */}
          {slide.images.length > 0 && (
            <div className="pptx-slide-images">
              {slide.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.src}
                  alt={img.alt}
                  className="pptx-slide-image"
                />
              ))}
            </div>
          )}

          {/* Text content */}
          <div className="pptx-slide-texts">
            {slide.texts.map((text, idx) => (
              <p key={idx} className="pptx-slide-text">
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* Slide number */}
        <div className="pptx-slide-number">
          {currentSlide + 1} / {totalSlides}
        </div>
      </div>

      {/* Navigation */}
      {totalSlides > 1 && (
        <>
          <button
            className="pptx-nav pptx-nav-prev"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            aria-label="前のスライド"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            className="pptx-nav pptx-nav-next"
            onClick={handleNext}
            disabled={currentSlide === totalSlides - 1}
            aria-label="次のスライド"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Slide thumbnails */}
      {totalSlides > 1 && (
        <div className="pptx-thumbnails">
          {parsedPptx.slides.map((_, idx) => (
            <button
              key={idx}
              className={`pptx-thumbnail ${idx === currentSlide ? "active" : ""}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`スライド ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
