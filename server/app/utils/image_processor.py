# app/utils/image_processor.py - Enhanced with Detailed Debugging
"""
Utility สำหรับประมวลผลรูปภาพ:
- ลบพื้นหลัง (background removal)
- จัดรูปให้มาตรฐาน (standardization)
- จัดกึ่งกลางพร้อม space
"""
import io
import os
from typing import Tuple, Optional, Union
from PIL import Image
from fastapi import UploadFile


class ImageProcessor:
    """Class สำหรับประมวลผลรูปภาพ"""

    @staticmethod
    def process_image_standard(
        input_source,
        max_size: int = 1024,
        padding: int = 30,
        return_bytes: bool = False,
        debug: bool = True
    ) -> Tuple[Optional[Union[bytes, Image.Image]], Optional[Tuple[int, int]]]:
        """
        ประมวลผลรูปภาพให้เป็นมาตรฐาน:
        1. ลบพื้นหลัง
        2. Crop ขอบเขตวัตถุ
        3. Resize ให้ขนาดมาตรฐาน
        4. เพิ่ม padding
        5. จัดกึ่งกลาง

        Parameters:
        -----------
        input_source : str | bytes | UploadFile | Image
            แหล่งข้อมูลรูปภาพ
        
        max_size : int
            ขนาดสูงสุดของด้านที่ยาวที่สุด (รวม padding) default=1024
        
        padding : int
            ระยะห่างจากขอบ default=30
        
        return_bytes : bool
            True = return bytes, False = return PIL Image
        
        debug : bool
            แสดง debug messages

        Returns:
        --------
        Tuple[bytes | Image | None, Tuple[int, int] | None]
            - ข้อมูลรูปที่ประมวลผลแล้ว (หรือ None ถ้าล้มเหลว)
            - (width, height) ขนาดของรูปผลลัพธ์
        """
        try:
            if debug:
                print("\n" + "="*60)
                print("🎨 [IMAGE PROCESSOR] Starting image processing...")
                print("="*60)

            # ========================================
            # STEP 1: อ่านรูปภาพจาก source ต่างๆ
            # ========================================
            if debug:
                print(f"\n📂 STEP 1: Reading image from source...")
                print(f"   Input type: {type(input_source)}")

            input_image = None

            if isinstance(input_source, str):
                # จาก path
                if not os.path.exists(input_source):
                    print(f"❌ ERROR: File not found: {input_source}")
                    return None, None
                
                with open(input_source, 'rb') as f:
                    input_image = f.read()
                
                if debug:
                    print(f"   ✅ Read from path: {input_source}")
                    print(f"   File size: {len(input_image)} bytes")
            
            elif isinstance(input_source, bytes):
                # จาก bytes
                input_image = input_source
                if debug:
                    print(f"   ✅ Read from bytes")
                    print(f"   Data size: {len(input_image)} bytes")
            
            elif isinstance(input_source, UploadFile):
                # จาก FastAPI UploadFile
                input_image = input_source.file.read()
                input_source.file.seek(0)  # reset file pointer
                if debug:
                    print(f"   ✅ Read from UploadFile")
                    print(f"   Filename: {input_source.filename}")
                    print(f"   Content type: {input_source.content_type}")
                    print(f"   Data size: {len(input_image)} bytes")
            
            elif isinstance(input_source, Image.Image):
                # จาก PIL Image
                img_byte_arr = io.BytesIO()
                input_source.save(img_byte_arr, format='PNG')
                input_image = img_byte_arr.getvalue()
                if debug:
                    print(f"   ✅ Read from PIL Image")
                    print(f"   Image size: {input_source.size}")
                    print(f"   Image mode: {input_source.mode}")
            
            else:
                print(f"❌ ERROR: Unsupported input type: {type(input_source)}")
                return None, None

            if input_image is None or len(input_image) == 0:
                print(f"❌ ERROR: Empty image data")
                return None, None

            # ========================================
            # STEP 2: ลบพื้นหลัง
            # ========================================
            if debug:
                print(f"\n🎨 STEP 2: Removing background...")
                print(f"   Using rembg library...")

            try:
                from rembg import remove
                subject_only = remove(input_image)
                
                if debug:
                    print(f"   ✅ Background removed successfully")
                    print(f"   Output size: {len(subject_only)} bytes")
                
            except ImportError as e:
                print(f"❌ ERROR: rembg not installed!")
                print(f"   Install with: pip install rembg --break-system-packages")
                return None, None
            except Exception as e:
                print(f"❌ ERROR: Background removal failed")
                print(f"   Error: {e}")
                import traceback
                traceback.print_exc()
                return None, None

            # ========================================
            # STEP 3: Convert เป็น PIL Image (RGBA)
            # ========================================
            if debug:
                print(f"\n🖼️  STEP 3: Converting to PIL Image...")

            try:
                img = Image.open(io.BytesIO(subject_only))
                original_mode = img.mode
                img = img.convert("RGBA")
                
                if debug:
                    print(f"   Original mode: {original_mode}")
                    print(f"   Converted to: RGBA")
                    print(f"   Image size: {img.size}")
                    print(f"   ✅ Conversion successful")
                
            except Exception as e:
                print(f"❌ ERROR: Failed to convert to PIL Image")
                print(f"   Error: {e}")
                return None, None

            # ========================================
            # STEP 4: หาขอบเขตวัตถุและครอป
            # ========================================
            if debug:
                print(f"\n✂️  STEP 4: Finding object bounds and cropping...")

            bbox = img.getbbox()
            if not bbox:
                print(f"❌ ERROR: No object found in image (bbox is None)")
                print(f"   This usually means:")
                print(f"   - Image is completely transparent")
                print(f"   - Background removal removed everything")
                print(f"   - Image is empty")
                return None, None
            
            if debug:
                print(f"   Bounding box: {bbox}")
                print(f"   Box size: {bbox[2] - bbox[0]} x {bbox[3] - bbox[1]}")
            
            cropped_img = img.crop(bbox)
            
            if debug:
                print(f"   ✅ Cropped to object bounds")
                print(f"   Cropped size: {cropped_img.size}")

            # ========================================
            # STEP 5: ปรับขนาดให้เป็นค่ามาตรฐาน
            # ========================================
            if debug:
                print(f"\n📏 STEP 5: Resizing to standard size...")
                print(f"   Max size (with padding): {max_size}")
                print(f"   Padding: {padding}")

            inner_max_size = max_size - (padding * 2)
            original_size = cropped_img.size
            cropped_img.thumbnail((inner_max_size, inner_max_size), Image.Resampling.LANCZOS)
            
            if debug:
                print(f"   Inner max size: {inner_max_size}")
                print(f"   Original size: {original_size}")
                print(f"   Resized to: {cropped_img.size}")
                print(f"   ✅ Resize complete")

            # ========================================
            # STEP 6: สร้างเฟรมใหม่ + padding
            # ========================================
            if debug:
                print(f"\n🖼️  STEP 6: Creating frame with padding...")

            new_width = cropped_img.width + (padding * 2)
            new_height = cropped_img.height + (padding * 2)
            
            # สร้างพื้นหลังโปร่งใส (RGBA)
            final_img = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
            
            if debug:
                print(f"   Frame size: {new_width} x {new_height}")
                print(f"   Background: Transparent")

            # ========================================
            # STEP 7: วางวัตถุลงตรงกลาง
            # ========================================
            if debug:
                print(f"\n🎯 STEP 7: Centering object...")

            paste_x = padding
            paste_y = padding
            final_img.paste(cropped_img, (paste_x, paste_y), cropped_img)
            
            if debug:
                print(f"   Paste position: ({paste_x}, {paste_y})")
                print(f"   ✅ Object centered")

            # ========================================
            # STEP 8: Return ผลลัพธ์
            # ========================================
            if debug:
                print(f"\n✅ STEP 8: Processing complete!")
                print(f"   Final size: {new_width} x {new_height} px")
                print(f"   Output format: PNG (RGBA)")
                print("="*60 + "\n")

            if return_bytes:
                img_byte_arr = io.BytesIO()
                final_img.save(img_byte_arr, format='PNG')
                return img_byte_arr.getvalue(), (new_width, new_height)
            else:
                return final_img, (new_width, new_height)

        except Exception as e:
            print(f"\n❌ FATAL ERROR in image processing!")
            print(f"   Error: {e}")
            import traceback
            traceback.print_exc()
            return None, None

    @staticmethod
    def save_processed_image(
        input_source,
        output_path: str,
        max_size: int = 1024,
        padding: int = 30,
        debug: bool = True
    ) -> Tuple[bool, Optional[str], Optional[Tuple[int, int]]]:
        """
        ประมวลผลรูปภาพและบันทึกไฟล์

        Returns:
        --------
        Tuple[bool, str, Tuple[int, int]]
            - success: True/False
            - path: path ของไฟล์ที่บันทึก
            - size: (width, height)
        """
        try:
            if debug:
                print(f"\n💾 Saving processed image to: {output_path}")

            # Ensure directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Process image
            final_img, size = ImageProcessor.process_image_standard(
                input_source,
                max_size=max_size,
                padding=padding,
                return_bytes=False,
                debug=debug
            )

            if final_img is None:
                print(f"❌ Processing failed, cannot save")
                return False, None, None

            # Save to disk
            final_img.save(output_path, "PNG")
            
            if debug:
                print(f"✅ Saved successfully to: {output_path}")

            return True, output_path, size

        except Exception as e:
            print(f"❌ Save error: {e}")
            import traceback
            traceback.print_exc()
            return False, None, None

    @staticmethod
    def process_and_get_bytes(
        input_source,
        max_size: int = 1024,
        padding: int = 30,
        debug: bool = True
    ) -> Optional[bytes]:
        """
        ประมวลผลรูปภาพและ return เป็น bytes

        Returns:
        --------
        bytes | None
            ข้อมูล PNG bytes ของรูปที่ประมวลผลแล้ว
        """
        result_bytes, _ = ImageProcessor.process_image_standard(
            input_source,
            max_size=max_size,
            padding=padding,
            return_bytes=True,
            debug=debug
        )
        return result_bytes


# ===============================
# Convenience Functions
# ===============================

def process_vton_image(
    input_source,
    image_type: str = "garment",
    max_size: int = 1024,
    padding: int = 30,
    debug: bool = True
) -> Optional[bytes]:
    """
    ประมวลผลรูปภาพสำหรับ VTON
    
    Parameters:
    -----------
    input_source : str | bytes | UploadFile
        รูปภาพต้นฉบับ
    
    image_type : str
        ประเภทรูป: "garment" (เสื้อผ้า), "model" (คนแบบ)
    
    max_size : int
        ขนาดสูงสุด (default=1024)
    
    padding : int
        padding (garment=30, model=50)
    
    debug : bool
        แสดง debug messages

    Returns:
    --------
    bytes | None
        PNG bytes ของรูปที่ประมวลผลแล้ว
    """
    # ปรับค่าตาม type
    if image_type == "model":
        padding = 50  # model ต้องการ padding มากกว่า
    elif image_type == "garment":
        padding = 30
    
    if debug:
        print(f"\n🎨 [VTON] Processing {image_type} image...")
        print(f"   Max size: {max_size}")
        print(f"   Padding: {padding}")
    
    return ImageProcessor.process_and_get_bytes(
        input_source,
        max_size=max_size,
        padding=padding,
        debug=debug
    )


def should_process_image(filename: str) -> bool:
    """
    เช็คว่าไฟล์นี้ควรประมวลผลหรือไม่
    (เฉพาะไฟล์รูปภาพ)
    """
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    ext = os.path.splitext(filename.lower())[1]
    return ext in allowed_extensions


# ===============================
# Test & Debug Functions
# ===============================

def test_image_processing(input_path: str, output_path: str = "test_output.png"):
    """
    ทดสอบการประมวลผลรูปภาพ

    Usage:
    ------
    from app.utils.image_processor import test_image_processing
    test_image_processing("test_input.jpg", "test_output.png")
    """
    print("\n" + "="*60)
    print("🧪 TESTING IMAGE PROCESSOR")
    print("="*60)
    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    
    success, path, size = ImageProcessor.save_processed_image(
        input_source=input_path,
        output_path=output_path,
        max_size=1024,
        padding=30,
        debug=True
    )
    
    if success:
        print("\n✅ TEST PASSED!")
        print(f"Output saved to: {path}")
        print(f"Size: {size}")
    else:
        print("\n❌ TEST FAILED!")
    
    return success


def check_rembg_installation():
    """ตรวจสอบว่า rembg ติดตั้งแล้วหรือยัง"""
    try:
        from rembg import remove
        print("✅ rembg is installed and working")
        return True
    except ImportError:
        print("❌ rembg is NOT installed")
        print("Install with: pip install rembg --break-system-packages")
        return False
    except Exception as e:
        print(f"❌ rembg error: {e}")
        return False