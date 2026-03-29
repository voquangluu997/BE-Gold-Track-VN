// src/common/utils/string.util.ts
export class StringUtil {
    /**
     * Chuẩn hóa string: loại bỏ dấu, chuyển về chữ thường
     */
    static normalize(str: string): string {
      if (!str) return '';
      return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }
  
    /**
     * Chuyển về uppercase
     */
    static toUpper(str: string): string {
      if (!str) return '';
      return str.toUpperCase().trim();
    }
  
    /**
     * Chuyển về lowercase
     */
    static toLower(str: string): string {
      if (!str) return '';
      return str.toLowerCase().trim();
    }
  
    /**
     * Kiểm tra string có chứa substring không (không phân biệt hoa thường)
     */
    static contains(text: string, search: string): boolean {
      if (!text || !search) return false;
      return text.toLowerCase().includes(search.toLowerCase());
    }
  
    /**
     * So sánh 2 string (không phân biệt hoa thường)
     */
    static equals(str1: string, str2: string): boolean {
      if (!str1 || !str2) return false;
      return str1.toLowerCase() === str2.toLowerCase();
    }
  }