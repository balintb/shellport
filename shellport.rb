# frozen_string_literal: true
# typed: true

class Shellport < Formula
  desc "Display airport taxiway/runway maps in terminal"
  homepage "https://github.com/balintb/shellport"
  url "https://github.com/balintb/shellport/archive/refs/tags/v0.0.1.tar.gz"
  sha256 "replace_with_actual_sha256_hash_when_creating_release"
  license "MIT"

  depends_on "bun"

  def install
    system "bun", "install"

    (bin/"shellport").write <<~EOS
      #!/bin/bash
      exec bun run "#{libexec}/src/cli.ts" "$@"
    EOS

    libexec.install Dir["*"]
  end

  test do
    assert_match "shellport - Display airport diagrams in terminal", shell_output("#{bin}/shellport --help")

    assert_match "Error: Please provide a valid 4-letter ICAO code", shell_output("#{bin}/shellport ABC 2>&1", 1)
  end
end