// Trạng thái rỗng của tủ đồ. Không chỉ báo "chưa có gì" — dẫn luôn người
// dùng tới thao tác đầu tiên cần làm (quyết định #8 trong brief), vì chụp
// ảnh món đồ đầu tiên là nằm ngay phía trên ở cùng trang này.
export function EmptyCloset() {
  return (
    <div className="border-t border-muted/40 py-16 text-center">
      <p className="font-display text-2xl">Tủ đồ của bạn đang trống</p>
      <p className="mx-auto mt-4 max-w-md font-body text-base text-accent-soft">
        Chụp một món bất kỳ trong tủ của bạn — Bí Mặc đọc ảnh và điền nhãn sẵn, bạn chỉ cần
        lướt qua và sửa chỗ chưa đúng. Mỗi món thêm vào đều giúp AI phối đồ hiểu rõ hơn những gì
        bạn đang có.
      </p>
    </div>
  )
}
