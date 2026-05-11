-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 10-Out-2023 às 05:22
-- Versão do servidor: 10.4.17-MariaDB
-- versão do PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `fortune`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `fortune_data`
--

CREATE TABLE `fortune_data` (
  `id` int(11) NOT NULL,
  `user_name` varchar(255) DEFAULT 'Guest',
  `credit` int(11) DEFAULT 22849,
  `num_line` int(11) DEFAULT 5,
  `line_num` int(11) DEFAULT 5,
  `bet_amount` int(11) DEFAULT 2,
  `free_num` int(11) DEFAULT 0,
  `free_total` int(11) DEFAULT -1,
  `free_amount` int(11) DEFAULT 18000,
  `free_multi` int(11) DEFAULT 0,
  `freespin_mode` int(11) DEFAULT 0,
  `multiple_list` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`multiple_list`)),
  `credit_line` int(11) DEFAULT 10,
  `buy_feature` int(11) DEFAULT 50,
  `buy_max` int(11) DEFAULT 1300,
  `feature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`feature`)),
  `total_way` int(11) DEFAULT 27,
  `multipy` int(11) DEFAULT 0,
  `token` varchar(255) DEFAULT NULL,
  `freemode` tinyint(1) DEFAULT 0,
  `jackpot` int(11) DEFAULT 0,
  `free_spin` int(11) DEFAULT 0,
  `fortune.losses` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `fortune_data`
--

INSERT INTO `fortune_data` (`id`, `user_name`, `credit`, `num_line`, `line_num`, `bet_amount`, `free_num`, `free_total`, `free_amount`, `free_multi`, `freespin_mode`, `multiple_list`, `credit_line`, `buy_feature`, `buy_max`, `feature`, `total_way`, `multipy`, `token`, `freemode`, `jackpot`, `free_spin`, `fortune.losses`) VALUES
(1, 'Guest', 43923, 5, 5, 32, 0, -1, 5000, 0, 0, NULL, 10, 50, 1300, NULL, 27, 0, '10a2d98d-daa5-47f4-ab58-593767798ba1', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Estrutura da tabela `icon_data`
--

CREATE TABLE `icon_data` (
  `id` int(11) NOT NULL,
  `icon_name` varchar(255) NOT NULL,
  `token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `icon_data`
--

INSERT INTO `icon_data` (`id`, `icon_name`, `token`) VALUES
(1, 'Symbol_2', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(2, 'Symbol_0', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(3, 'Symbol_4', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(4, 'Symbol_4', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(5, 'Symbol_0', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(6, 'Symbol_5', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(7, 'Symbol_4', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(8, 'Symbol_5', '10a2d98d-daa5-47f4-ab58-593767798ba1'),
(9, 'Symbol_3', '10a2d98d-daa5-47f4-ab58-593767798ba1');

-- --------------------------------------------------------

--
-- Estrutura da tabela `losses`
--

CREATE TABLE `losses` (
  `id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `amount` int(11) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `bet_amount` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `losses`
--

INSERT INTO `losses` (`id`, `token`, `amount`, `timestamp`, `bet_amount`) VALUES
(1, '10a2d98d-daa5-47f4-ab58-593767798ba1', 0, '2023-10-10 03:07:50', 14),
(2, '10a2d98d-daa5-47f4-ab58-593767798ba1', 0, '2023-10-10 03:09:10', 5),
(3, '10a2d98d-daa5-47f4-ab58-593767798ba1', 0, '2023-10-10 03:09:18', 32);

-- --------------------------------------------------------

--
-- Estrutura da tabela `wins`
--

CREATE TABLE `wins` (
  `id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `amount` int(11) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `win_amount` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `fortune_data`
--
ALTER TABLE `fortune_data`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`);

--
-- Índices para tabela `icon_data`
--
ALTER TABLE `icon_data`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `losses`
--
ALTER TABLE `losses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `token` (`token`);

--
-- Índices para tabela `wins`
--
ALTER TABLE `wins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `token` (`token`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `fortune_data`
--
ALTER TABLE `fortune_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `icon_data`
--
ALTER TABLE `icon_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `losses`
--
ALTER TABLE `losses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `wins`
--
ALTER TABLE `wins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para despejos de tabelas
--

--
-- Limitadores para a tabela `losses`
--
ALTER TABLE `losses`
  ADD CONSTRAINT `losses_ibfk_1` FOREIGN KEY (`token`) REFERENCES `fortune_data` (`token`);

--
-- Limitadores para a tabela `wins`
--
ALTER TABLE `wins`
  ADD CONSTRAINT `wins_ibfk_1` FOREIGN KEY (`token`) REFERENCES `fortune_data` (`token`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
