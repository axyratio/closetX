from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user_repository import get_user_by_user_id
from app.core.security import hash_password


def get_my_profile(db: Session, user_id):
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        return None
    
    return user

def change_user_password(db: Session, user_id: int, new_password: str) -> User | None:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    user.password = hash_password(new_password)
    db.add(user)
    return user

def update_user(db: Session, user_id: str, update_data):
    print(f"\n{'='*80}")
    print(f"🔍 [REPO] update_user called")
    print(f"{'='*80}")
    print(f"📍 [REPO] user_id: {user_id}")
    print(f"📦 [REPO] update_data received: {update_data}")
    print(f"{'='*80}\n")
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        print(f"❌ [REPO] User not found with user_id: {user_id}")
        return None
    
    print(f"✅ [REPO] User found!")
    print(f"   - user_id: {user.user_id}")
    print(f"   - username: {user.username}")
    print(f"   - email: {user.email}")
    print(f"   - 🖼️  CURRENT profile_picture in DB: {user.profile_picture}")
    print()

    changed = False
    
    # ✅ อัปเดต first_name
    if update_data.get("first_name") is not None and update_data["first_name"] != user.first_name:
        print(f"🔄 [REPO] Updating first_name: '{user.first_name}' → '{update_data['first_name']}'")
        user.first_name = update_data["first_name"]
        changed = True
    
    # ✅ อัปเดต last_name
    if update_data.get("last_name") is not None and update_data["last_name"] != user.last_name:
        print(f"🔄 [REPO] Updating last_name: '{user.last_name}' → '{update_data['last_name']}'")
        user.last_name = update_data["last_name"]
        changed = True
    
    # ✅ อัปเดต username
    if update_data.get("username") is not None and update_data["username"] != user.username:
        print(f"🔄 [REPO] Updating username: '{user.username}' → '{update_data['username']}'")
        user.username = update_data["username"]
        changed = True
    
    # ✅ อัปเดต birth_date
    if update_data.get("birth_date") is not None and update_data["birth_date"] != user.birth_date:
        print(f"🔄 [REPO] Updating birth_date: '{user.birth_date}' → '{update_data['birth_date']}'")
        user.birth_date = update_data["birth_date"]
        changed = True
    
    # ✅ อัปเดต email
    if update_data.get("email") is not None and update_data["email"] != user.email:
        print(f"🔄 [REPO] Updating email: '{user.email}' → '{update_data['email']}'")
        user.email = update_data["email"]
        changed = True
    
    # ✅✅✅ อัปเดต profile_picture (นี่คือส่วนสำคัญที่หายไป!)
    if "profile_picture" in update_data:
        old_pic = user.profile_picture
        new_pic = update_data["profile_picture"]
        print(f"\n🖼️  [REPO] Processing profile_picture update:")
        print(f"   OLD: {old_pic}")
        print(f"   NEW: {new_pic}")
        
        if new_pic != old_pic:
            print(f"   ✅ Values are different - UPDATING!")
            user.profile_picture = new_pic
            changed = True
        else:
            print(f"   ⚠️  Values are the same - skipping")
    else:
        print(f"⚠️ [REPO] 'profile_picture' not in update_data")

    print()
    
    if not changed:
        print(f"⚠️ [REPO] No changes detected!")
        print(f"   Returning user without flush")
        print(f"{'='*80}\n")
        return user
    
    print(f"✅ [REPO] Changes detected! Flushing to DB...")
    db.flush()
    
    print(f"✅ [REPO] Refreshing user object from DB...")
    db.refresh(user)
    
    print(f"\n📊 [REPO] Final state after update:")
    print(f"   - first_name: {user.first_name}")
    print(f"   - last_name: {user.last_name}")
    print(f"   - username: {user.username}")
    print(f"   - email: {user.email}")
    print(f"   - 🖼️  profile_picture: {user.profile_picture}")
    print(f"\n✅ [REPO] Update complete!")
    print(f"{'='*80}\n")
    
    return user

def delete_user(db: Session, user_id: str):
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return None
        
        user.is_active = False
        db.flush()

        return user  # คืน instance ที่ยังเป็น mapped class
    except:
        db.rollback()
        raise