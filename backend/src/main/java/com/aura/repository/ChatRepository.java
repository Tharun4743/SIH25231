package com.aura.repository;

import com.aura.model.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, Long> {
    List<Chat> findAllByOrderByCreatedAtAsc();
    List<Chat> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
